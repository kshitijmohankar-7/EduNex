"""
EduNex Retrieval-Augmented Generation (RAG) engine.

Pipeline:
  uploaded PDF/DOC/DOCX -> text extraction -> chunking -> Gemini embeddings
  -> Chroma persistent vector store -> semantic retrieval -> Gemini answer

The vector store contains course-material chunks only. Student dashboard
authorization remains in the Node backend.
"""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from docx import Document
from google import genai
from google.genai import types
from pypdf import PdfReader


CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_store")
# v2 avoids mixing older 384-dimensional sentence-transformer data with the
# new Gemini 768-dimensional embedding space.
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "study_materials_v2")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIMENSIONS = int(os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "768"))

_client = chromadb.PersistentClient(path=CHROMA_PATH)
_collection = _client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
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


def index_document(subject_id: int, title: str, text: str) -> int:
    """Replace an existing material in Chroma and index its chunks."""
    chunks = chunk_text(text)
    if not chunks:
        return 0

    document_key = _document_key(subject_id, title)

    existing = _collection.get(where={"document_key": document_key})
    existing_ids = existing.get("ids", []) if existing else []
    if existing_ids:
        _collection.delete(ids=existing_ids)

    embeddings = _embed_documents(chunks)
    if len(embeddings) != len(chunks):
        raise RuntimeError("Embedding count does not match chunk count")

    ids = [f"{document_key}-{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "subject_id": int(subject_id),
            "title": title,
            "document_key": document_key,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]

    _collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
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
        raise ValueError("Legacy .doc files are not supported for automatic text extraction. Convert it to .docx or PDF.")

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
    """Return the most relevant study-material chunks for a question."""
    if _collection.count() == 0:
        return []

    query_embedding = _embed_query(question)
    where = {"subject_id": int(subject_id)} if subject_id is not None else None

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=max(1, min(top_k, 10)),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    retrieved: List[Dict[str, Any]] = []
    for index, document in enumerate(documents):
        metadata = metadatas[index] if index < len(metadatas) else {}
        distance = distances[index] if index < len(distances) else None
        retrieved.append(
            {
                "text": document,
                "title": metadata.get("title", "Study material"),
                "subject_id": metadata.get("subject_id"),
                "chunk_index": metadata.get("chunk_index", 0),
                "distance": distance,
            }
        )

    return retrieved


def answer_from_materials(question: str, subject_id: int = None, top_k: int = 6) -> str:
    """Compatibility helper returning retrieved text as a grounded context block."""
    chunks = retrieve_materials(question, subject_id=subject_id, top_k=top_k)
    if not chunks:
        return ""

    return "\n\n".join(
        f"[Source: {item['title']}]\n{item['text']}"
        for item in chunks
    )


def collection_stats() -> Dict[str, Any]:
    return {
        "collection": COLLECTION_NAME,
        "chunks": _collection.count(),
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "chroma_path": CHROMA_PATH,
    }
