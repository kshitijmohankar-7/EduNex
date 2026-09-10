"""
EduNex AI Service
FastAPI microservice providing a student-focused AI assistant, RAG-based
Q&A over study materials, and performance insights.

Authorization stays in the Node backend. This service only reasons over the
context that Node explicitly sends for the authenticated student.
"""
import json
import os
from typing import Any, Dict
from urllib import error, request as urlrequest

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from insights import generate_performance_insight

# RAG is optional. The Gemini student chatbot must be able to start even when
# Chroma/hnswlib is unavailable on the local machine.
try:
    from rag import answer_from_materials, index_document
    RAG_AVAILABLE = True
except (ImportError, OSError) as exc:
    answer_from_materials = None
    index_document = None
    RAG_AVAILABLE = False
    print(f"RAG disabled: {exc}")

load_dotenv()

app = FastAPI(title="EduNex AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    reply: str
    used_context: bool = False


def build_student_prompt(message: str, context: Dict[str, Any]) -> str:
    """Create a strict grounding prompt from the data authorized by Node."""
    marks = context.get("marks", [])
    attendance = context.get("attendance", [])
    assignments = context.get("assignments", [])

    return f"""
You are EduNex AI, a helpful academic assistant for a college student.

Rules:
1. Answer clearly and simply.
2. Use the student's supplied academic data when the question is about the student.
3. Never invent marks, attendance, assignments, deadlines, subjects, or college-specific facts.
4. If the supplied data does not contain the answer, say that the information is not available.
5. For study questions, explain concepts step-by-step at a beginner-friendly level.
6. Do not claim to have access to data that is not included below.
7. When useful, give a short actionable recommendation.

Student academic context:
MARKS:
{json.dumps(marks, default=str, indent=2)}

ATTENDANCE:
{json.dumps(attendance, default=str, indent=2)}

ASSIGNMENTS:
{json.dumps(assignments, default=str, indent=2)}

Student question:
{message}
""".strip()


def call_gemini(prompt: str) -> str | None:
    """Call Gemini only when a key is configured; return None on provider failure."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800,
        },
    }

    body = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))

        candidates = data.get("candidates", [])
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        return text or None
    except (error.URLError, error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError):
        return None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": bool(os.getenv("GEMINI_API_KEY")),
        "rag_available": RAG_AVAILABLE,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    context = req.context

    # Student questions are answered by the real LLM when configured,
    # with only the authorized context supplied by Node.
    if context.get("role") == "student":
        llm_reply = call_gemini(build_student_prompt(message, context))
        if llm_reply:
            return ChatResponse(reply=llm_reply, used_context=True)

        # Safe fallback when no LLM key is configured or the provider is unavailable.
        lower = message.lower()
        if any(k in lower for k in ["attendance", "present", "absent"]):
            return ChatResponse(
                reply=generate_performance_insight(message, context),
                used_context=True,
            )

        if any(k in lower for k in ["mark", "ct1", "ct-1", "ct2", "ct-2", "performance"]):
            return ChatResponse(
                reply=generate_performance_insight(message, context),
                used_context=True,
            )

        assignments = context.get("assignments", [])
        if "assignment" in lower and assignments:
            lines = []
            for item in assignments:
                status = item.get("submission_status", "not_submitted")
                deadline = item.get("deadline") or "no deadline"
                lines.append(
                    f"{item.get('subject', 'Subject')}: {item.get('title', 'Assignment')} — {status}, deadline {deadline}"
                )
            return ChatResponse(
                reply="Here are your assignments:\n" + "\n".join(lines),
                used_context=True,
            )

    # Study-material RAG fallback is optional because Chroma/hnswlib is a
    # native dependency that may not have a Windows wheel for every Python version.
    if any(k in message.lower() for k in ["explain", "summarize", "notes", "unit", "pdf"]):
        if RAG_AVAILABLE and answer_from_materials is not None:
            reply = answer_from_materials(message)
            return ChatResponse(reply=reply, used_context=True)
        return ChatResponse(
            reply="Study-material RAG is not available on this installation yet. The Gemini student assistant is still available for general study questions.",
            used_context=bool(context),
        )

    return ChatResponse(
        reply=(
            "EduNex AI is ready. Ask me about your attendance, published marks, "
            "assignments, study materials, or a topic you want to learn."
        ),
        used_context=bool(context),
    )


class IndexRequest(BaseModel):
    subject_id: int
    title: str
    text: str


@app.post("/index-document")
def index_document_endpoint(req: IndexRequest):
    """Called by the Node backend after a faculty member uploads material/PDF text."""
    if not RAG_AVAILABLE or index_document is None:
        return {
            "chunks_indexed": 0,
            "rag_available": False,
            "message": "RAG is not available because its optional Chroma dependency is not installed.",
        }

    chunks_indexed = index_document(req.subject_id, req.title, req.text)
    return {"chunks_indexed": chunks_indexed, "rag_available": True}
