"""
Retrieval-Augmented Generation over uploaded study materials.

Flow: PDF/notes -> text extraction -> chunking -> embeddings -> vector DB
      -> student question -> similarity search -> relevant chunks -> LLM -> answer

Uses Chroma as a lightweight local vector store and sentence-transformers
for embeddings so this runs without any external API keys out of the box.
Swap `embed()` for an API-based embedding model in production if preferred.
"""
from typing import List
import chromadb
from sentence_transformers import SentenceTransformer

_client = chromadb.PersistentClient(path="./chroma_store")
_collection = _client.get_or_create_collection("study_materials")
_embedder = SentenceTransformer("all-MiniLM-L6-v2")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start = end - overlap
    return chunks


def index_document(subject_id: int, title: str, text: str) -> int:
    """Chunks a document, embeds each chunk, and stores it in the vector DB."""
    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = _embedder.encode(chunks).tolist()
    ids = [f"{subject_id}-{title}-{i}" for i in range(len(chunks))]
    metadatas = [{"subject_id": subject_id, "title": title, "chunk_index": i} for i in range(len(chunks))]

    _collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    return len(chunks)


def answer_from_materials(question: str, subject_id: int = None, top_k: int = 4) -> str:
    """
    Retrieves the most relevant chunks for a question and (in production)
    passes them to an LLM to generate a grounded answer.

    IMPORTANT: if no relevant material is found, this must say so rather
    than letting the LLM improvise an answer that sounds authoritative
    but isn't grounded in real course content.
    """
    query_embedding = _embedder.encode([question]).tolist()[0]

    where = {"subject_id": subject_id} if subject_id is not None else None
    results = _collection.query(query_embeddings=[query_embedding], n_results=top_k, where=where)

    documents = results.get("documents", [[]])[0]
    if not documents:
        return "I couldn't find that in your available study materials. Ask your instructor to confirm it's been uploaded, or try rephrasing your question."

    # --- LLM integration point ---
    # context = "\n\n".join(documents)
    # prompt = f"Using ONLY the context below, answer the question. If the answer isn't in the context, say so.\n\nContext:\n{context}\n\nQuestion: {question}"
    # response = call_llm(prompt)
    # return response

    combined = " ".join(documents)[:600]
    return f"Based on your uploaded materials: {combined}..."
