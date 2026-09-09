"""
EduNex AI Service
FastAPI microservice providing chat, RAG-based Q&A over study materials,
and simple performance insight generation.

This service is deliberately "dumb" about authorization: the Node backend
is responsible for only forwarding data the requesting user is allowed to see.
This service must never independently query the main database.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from rag import answer_from_materials, index_document
from insights import generate_performance_insight

app = FastAPI(title="EduNex AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production to the Node backend's origin
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    reply: str
    used_context: bool = False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Routes the incoming message to the right handler based on simple
    intent detection. A production version would use the LLM itself
    to route, and would call the LLM API for the final response —
    see rag.py and insights.py for where that integration point is.
    """
    message = req.message.lower()
    context = req.context

    # Intent: "what is my ct-1/ct-2/attendance" style questions -> answer from authorized context only
    if context.get("role") == "student" and any(k in message for k in ["ct-1", "ct1", "ct-2", "ct2", "attendance", "marks", "performance"]):
        reply = generate_performance_insight(message, context)
        return ChatResponse(reply=reply, used_context=True)

    # Intent: study material question -> RAG lookup
    if any(k in message for k in ["explain", "summarize", "notes", "unit", "pdf"]):
        reply = answer_from_materials(message)
        return ChatResponse(reply=reply, used_context=True)

    # Fallback: general academic assistant reply.
    # Replace this stub with an actual call to your LLM provider (see README "Wiring up the LLM").
    return ChatResponse(reply=(
        "I can help with your notes, assignments, marks, attendance, and study planning. "
        "Try asking things like 'What is my CT-2 performance?' or 'Explain Unit 2 from my DBMS notes.'"
    ))


class IndexRequest(BaseModel):
    subject_id: int
    title: str
    text: str


@app.post("/index-document")
def index_document_endpoint(req: IndexRequest):
    """Called by the Node backend after a faculty member uploads a new material/PDF."""
    chunks_indexed = index_document(req.subject_id, req.title, req.text)
    return {"chunks_indexed": chunks_indexed}
