"""
EduNex AI Service
FastAPI microservice providing a student-focused AI assistant, RAG-based
Q&A over study materials, and performance insights.

Authorization stays in the Node backend. This service only reasons over the
context that Node explicitly sends for the authenticated student.
"""
import json
import os
from typing import Any, Dict, List
from urllib import error, request as urlrequest

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from insights import generate_performance_insight

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
    history: List[Dict[str, str]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    used_context: bool = False


def build_student_prompt(message: str, context: Dict[str, Any], history: List[Dict[str, str]]) -> str:
    """Build a compact, strongly grounded prompt from authorized data."""
    sections = []
    section_map = [
        ("PROFILE", "profile"),
        ("ATTENDANCE", "attendance"),
        ("PUBLISHED MARKS", "marks"),
        ("ASSIGNMENTS", "assignments"),
        ("ANNOUNCEMENTS", "announcements"),
        ("STUDY MATERIALS", "studyMaterials"),
        ("ACHIEVEMENTS", "achievements"),
        ("ELECTIVE CHOICE", "electiveChoice"),
        ("MARKSHEETS", "marksheets"),
    ]

    for title, key in section_map:
        if key in context:
            sections.append(f"{title}:\n{json.dumps(context[key], default=str, indent=2)}")

    dashboard_context = "\n\n".join(sections) or "No student dashboard data was needed for this question."
    conversation = "\n".join(
        f"{item.get('role', 'user').upper()}: {item.get('content', '')}"
        for item in history[-6:]
    )

    return f"""
You are EduNex AI, the student's personal academic assistant.

Answer the CURRENT QUESTION directly. Be complete but concise.

IMPORTANT RULES:
1. For educational questions, give a complete beginner-friendly explanation: definition,
   key idea, how it works, relevant types/components, a simple example, and practical use.
2. Never intentionally truncate an explanation. Finish the answer.
3. For student-data questions, use ONLY the supplied dashboard data. Never invent data.
4. For attendance, list EVERY subject supplied in ATTENDANCE with present/total and percentage,
   and state the overall percentage when available. Never omit rows.
5. For marks, list all relevant supplied marks and identify exam type and subject.
6. For assignments, include relevant assignments with submission status and deadline.
7. For announcements, use the supplied announcements. For summaries, be short and accurate.
8. For follow-ups such as "that announcement" or "explain the second one", use recent history.
9. If requested student information is not supplied, say it is not available.
10. Do not claim access to private data outside the supplied dashboard context.
11. Use simple language suitable for a college student.
12. Use Markdown headings, bullets, bold text, and short code examples when useful.

RECENT CONVERSATION:
{conversation or "No previous conversation."}

AUTHORIZED STUDENT DASHBOARD DATA:
{dashboard_context}

CURRENT QUESTION:
{message}
""".strip()


def call_gemini(prompt: str) -> str | None:
    """Call Gemini with a bounded timeout so a slow provider cannot hang the UI."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Gemini request skipped: GEMINI_API_KEY is not configured.")
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 65536,
        },
    }

    body = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        # Keep the chat responsive if Gemini/network is temporarily slow.
        with urlrequest.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))

        candidates = data.get("candidates", [])
        if not candidates:
            print(f"Gemini returned no candidates. Response: {json.dumps(data)[:1000]}")
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            print(f"Gemini returned an empty response. Response: {json.dumps(data)[:1000]}")
        return text or None
    except error.HTTPError as exc:
        try:
            response_body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            response_body = "<unable to read error response>"
        print(f"Gemini HTTP error {exc.code}: {response_body[:2000]}")
        return None
    except (error.URLError, TimeoutError) as exc:
        print(f"Gemini connection error: {exc}")
        return None
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"Gemini response parsing error: {exc}")
        return None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": bool(os.getenv("GEMINI_API_KEY")),
        "rag_available": RAG_AVAILABLE,
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    context = req.context
    history = req.history[-6:]

    if not message:
        return ChatResponse(reply="Please enter a question.", used_context=bool(context))

    llm_reply = call_gemini(build_student_prompt(message, context, history))
    if llm_reply:
        return ChatResponse(reply=llm_reply, used_context=bool(context))

    # Deterministic fallbacks keep dashboard questions useful when Gemini times out.
    lower = message.lower()
    if any(k in lower for k in ["attendance", "present", "absent"]):
        return ChatResponse(reply=generate_performance_insight(message, context), used_context=True)

    if any(k in lower for k in ["mark", "ct1", "ct-1", "ct2", "ct-2", "performance"]):
        return ChatResponse(reply=generate_performance_insight(message, context), used_context=True)

    assignments = context.get("assignments", [])
    if "assignment" in lower and isinstance(assignments, list) and assignments:
        lines = []
        for item in assignments:
            status = item.get("submission_status", "not_submitted")
            deadline = item.get("deadline") or "no deadline"
            lines.append(
                f"- {item.get('subject', 'Subject')}: {item.get('title', 'Assignment')} — "
                f"{status}, deadline {deadline}"
            )
        return ChatResponse(reply="Here are your assignments:\n" + "\n".join(lines), used_context=True)

    if any(k in lower for k in ["explain", "summarize", "notes", "unit", "pdf"]):
        if RAG_AVAILABLE and answer_from_materials is not None:
            return ChatResponse(reply=answer_from_materials(message), used_context=True)

    return ChatResponse(
        reply="I could not generate a complete AI response right now. Please try again.",
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
