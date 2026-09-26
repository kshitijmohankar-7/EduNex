"""
EduNex Retrieval-Augmented Generation (RAG) engine.

Pipeline:
  uploaded PDF/DOC/DOCX -> text extraction -> chunking -> Gemini embeddings
  -> Supabase PostgreSQL JSONB vector store -> semantic retrieval -> Gemini answer

The vector store contains course-material chunks only. Student dashboard
authorization remains in the Node backend.

This implementation intentionally avoids a local Chroma/PersistentClient so
the AI service can run on Render's Free plan, whose filesystem is ephemeral.
"""

from __future__ import annotations

import hashlib
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.types.json import Jsonb
from docx import Document
from google import genai
from google.genai import types
from pypdf import PdfReader


EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIMENSIONS = int(os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "768"))
COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "ai_rag_chunks")


def _database_url() -> str:
    value = (
        os.getenv("SUPABASE_DATABASE_URL", "").strip()
        or os.getenv("DATABASE_URL", "").strip()
    )
    if not value:
        raise RuntimeError("SUPABASE_DATABASE_URL or DATABASE_URL is not configured")
    return value


def _db_connection():
    return psycopg.connect(
        _database_url(),
        sslmode="require",
        connect_timeout=10,
    )


def _gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=api_key)


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> List[str]:
    """Split material into overlapping word chunks while cleaning noisy whitespace."""
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return []

    words = cleaned.split(" ")
    chunks: List[str] = []
    start = 0
    step = max(1, chunk_size - overlap)

    while start < len(words):
        chunk = " ".join(words[start : start + chunk_size]).strip()
        if chunk:
            chunks.append(chunk)
        start += step

    return chunks


def _embed_documents(texts: List[str]) -> List[List[float]]:
    """Create retrieval-document embeddings in batches using Gemini Embeddings."""
    if not texts:
        return []

    client = _gemini_client()
    embeddings: List[List[float]] = []

    for start in range(0, len(texts), 50):
        batch = texts[start : start + 50]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )
        embeddings.extend([list(item.values) for item in result.embeddings])

    return embeddings


def _embed_query(question: str) -> List[float]:
    client = _gemini_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=[question],
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )
    return list(result.embeddings[0].values)


def _document_key(subject_id: int, title: str) -> str:
    raw = f"{subject_id}:{title}".encode("utf-8")
    return hashlib.sha1(raw).hexdigest()[:20]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return -1.0
    return dot / (norm_a * norm_b)


def index_document(subject_id: int, title: str, text: str) -> int:
    """Replace an existing material in Supabase and index its chunks."""
    chunks = chunk_text(text)
    if not chunks:
        return 0

    document_key = _document_key(subject_id, title)
    embeddings = _embed_documents(chunks)

    if len(embeddings) != len(chunks):
        raise RuntimeError("Embedding count does not match chunk count")

    rows = [
        (
            f"{document_key}-{i}",
            int(subject_id),
            title,
            document_key,
            i,
            chunk,
            Jsonb(embedding),
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    with _db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM public.ai_rag_chunks WHERE document_key = %s",
                (document_key,),
            )
            cur.executemany(
                """
                INSERT INTO public.ai_rag_chunks
                    (id, subject_id, title, document_key, chunk_index, content, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                rows,
            )

    return len(chunks)


def extract_text_from_file(file_path: str) -> str:
    """Extract text from PDF, DOCX, or plain text files."""
    path = Path(file_path)
    suffix = path.suffix.lower()

    if not path.exists():
        raise FileNotFoundError(f"Study material file not found: {file_path}")

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        return "\n\n".join(pages).strip()

    if suffix == ".docx":
        document = Document(str(path))
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs).strip()

    if suffix == ".doc":
        raise ValueError(
            "Legacy .doc files are not supported for automatic text extraction. "
            "Convert it to .docx or PDF."
        )

    return path.read_text(encoding="utf-8", errors="ignore").strip()


def index_file(subject_id: int, title: str, file_path: str) -> int:
    """Extract and index an uploaded study-material file."""
    text = extract_text_from_file(file_path)
    return index_document(subject_id, title, text)


def retrieve_materials(
    question: str,
    subject_id: Optional[int] = None,
    top_k: int = 6,
) -> List[Dict[str, Any]]:
    """Return the most relevant study-material chunks using cosine similarity."""
    query_embedding = _embed_query(question)
    limit = max(1, min(top_k, 10))

    with _db_connection() as conn:
        with conn.cursor() as cur:
            if subject_id is None:
                cur.execute(
                    """
                    SELECT title, subject_id, chunk_index, content, embedding
                    FROM public.ai_rag_chunks
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT title, subject_id, chunk_index, content, embedding
                    FROM public.ai_rag_chunks
                    WHERE subject_id = %s
                    """,
                    (int(subject_id),),
                )
            rows = cur.fetchall()

    scored: List[Dict[str, Any]] = []
    for title, row_subject_id, chunk_index, content, embedding in rows:
        vector = embedding
        if isinstance(vector, str):
            import json
            vector = json.loads(vector)
        score = _cosine_similarity(query_embedding, list(vector or []))
        if score >= 0:
            scored.append(
                {
                    "text": content,
                    "title": title,
                    "subject_id": row_subject_id,
                    "chunk_index": chunk_index,
                    "distance": 1.0 - score,
                    "similarity": score,
                }
            )

    scored.sort(key=lambda item: item["similarity"], reverse=True)
    return scored[:limit]


def answer_from_materials(
    question: str,
    subject_id: int = None,
    top_k: int = 6,
) -> str:
    """Compatibility helper returning retrieved text as a grounded context block."""
    chunks = retrieve_materials(question, subject_id=subject_id, top_k=top_k)
    if not chunks:
        return ""

    return "\n\n".join(
        f"[Source: {item['title']}]\n{item['text']}"
        for item in chunks
    )


def collection_stats() -> Dict[str, Any]:
    """Return RAG store statistics without depending on local filesystem state."""
    with _db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.ai_rag_chunks")
            count = cur.fetchone()[0]

    return {
        "collection": COLLECTION_NAME,
        "chunks": count,
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "storage": "supabase_postgres",
    }
