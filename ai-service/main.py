"""
EduNex AI Service
FastAPI microservice providing a student-focused AI assistant, RAG-based
Q&A over study materials, and performance insights.

Authorization stays in the Node backend. This service only reasons over the
context that Node explicitly sends for the authenticated student.
"""
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib import error, request as urlrequest

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from insights import generate_performance_insight

try:
    from rag import (
        answer_from_materials,
        collection_stats,
        index_document,
        index_file,
        retrieve_materials,
    )
    RAG_AVAILABLE = True
except (ImportError, OSError, RuntimeError) as exc:
    answer_from_materials = None
    collection_stats = None
    index_document = None
    index_file = None
    retrieve_materials = None
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
    used_rag: bool = False
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    model_status: str = "ok"
    retry_after_seconds: Optional[int] = None


class IndexRequest(BaseModel):
    subject_id: int
    title: str
    text: str


class IndexFileRequest(BaseModel):
    subject_id: int
    title: str
    file_path: str


def build_student_prompt(
    message: str,
    context: Dict[str, Any],
    history: List[Dict[str, str]],
    rag_chunks: Optional[List[Dict[str, Any]]] = None,
) -> str:
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

    rag_context = ""
    if rag_chunks:
        source_blocks = []
        for number, item in enumerate(rag_chunks, start=1):
            source_blocks.append(
                f"SOURCE {number} — {item.get('title', 'Study material')}\n"
                f"{item.get('text', '')}"
            )
        rag_context = "\n\n".join(source_blocks)

    rag_rules = ""
    if rag_chunks:
        rag_rules = """
RAG / STUDY MATERIAL RULES:
- The RAG SOURCES below are retrieved from uploaded EduNex study materials.
- For this question, treat those sources as the primary authority.
- Answer using the retrieved sources and do not invent course-specific facts.
- If the sources do not contain enough information, explicitly say what is missing.
- You may explain or simplify the retrieved material, but do not silently replace it with unrelated facts.
- If the user asks for "each topic", organize the answer topic-by-topic and cover every topic supported by the retrieved material.
- Mention the relevant source/material title when it helps the student understand where the answer came from.
"""

    return f"""
You are EduNex AI, the student's personal academic assistant.

Answer the CURRENT QUESTION directly. Be complete, clear, and appropriately detailed.
For simple educational questions, answer immediately instead of overthinking.

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
13. Do not output internal reasoning or chain-of-thought. Give the useful explanation directly.
{rag_rules}
RECENT CONVERSATION:
{conversation or "No previous conversation."}

AUTHORIZED STUDENT DASHBOARD DATA:
{dashboard_context}

RAG SOURCES:
{rag_context or "No RAG sources were retrieved for this question."}

CURRENT QUESTION:
{message}
""".strip()


def _parse_retry_after_seconds(response_body: str) -> Optional[int]:
    """Extract Google's RetryInfo delay, if present, from a 429 response."""
    match = re.search(r"retry in\s+(\d+)s", response_body, flags=re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def call_gemini(prompt: str) -> Tuple[Optional[str], str, Optional[int]]:
    """Call Gemini and return (text, status, retry_after_seconds)."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Gemini request skipped: GEMINI_API_KEY is not configured.")
        return None, "not_configured", None

    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "thinkingConfig": {"thinkingLevel": "low"},
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
        with urlrequest.urlopen(req, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))

        candidates = data.get("candidates", [])
        if not candidates:
            print(f"Gemini returned no candidates. Response: {json.dumps(data)[:2000]}")
            return None, "empty", None

        candidate = candidates[0]
        parts = candidate.get("content", {}).get("parts", [])
        text = "".join(
            part.get("text", "") for part in parts if isinstance(part, dict)
        ).strip()
        if not text:
            print(
                "Gemini returned an empty response. "
                f"finishReason={candidate.get('finishReason')}, "
                f"finishMessage={candidate.get('finishMessage')}"
            )
            return None, "empty", None
        return text, "ok", None
    except error.HTTPError as exc:
        try:
            response_body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            response_body = "<unable to read error response>"

        retry_after = _parse_retry_after_seconds(response_body)
        if exc.code == 429:
            print(
                "Gemini quota/rate-limit error (429). "
                f"Retry after: {retry_after}s. Details: {response_body[:2000]}"
            )
            return None, "quota_exhausted", retry_after

        print(f"Gemini HTTP error {exc.code}: {response_body[:2000]}")
        return None, "http_error", retry_after
    except (error.URLError, TimeoutError, OSError) as exc:
        print(f"Gemini connection error: {exc}")
        return None, "connection_error", None
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"Gemini response parsing error: {exc}")
        return None, "parse_error", None


def educational_fallback(message: str) -> str | None:
    """Small offline safety net for common educational questions."""
    lower = message.lower().strip().replace("?", "")
    if "theory of relativity" in lower or "theory of relativity" in lower.replace("general ", ""):
        return (
            "## Theory of Relativity\n\n"
            "The **theory of relativity** was developed by **Albert Einstein**. "
            "It explains how **space, time, motion, gravity, and energy** are related. "
            "It has two parts:\n\n"
            "### 1. Special Relativity\n"
            "Special relativity (1905) applies mainly to objects moving at constant speed, "
            "especially at speeds close to the speed of light. Its two key ideas are that the "
            "laws of physics are the same for observers moving at constant velocity, and the "
            "speed of light in vacuum is constant for all such observers. This leads to effects "
            "such as **time dilation**, **length contraction**, and mass-energy equivalence.\n\n"
            "### 2. General Relativity\n"
            "General relativity (1915) explains gravity. Einstein showed that massive objects "
            "curve **spacetime**, and objects move through this curved spacetime. In simple words, "
            "the Sun curves spacetime around it, and Earth follows a path through that curved region, "
            "which we observe as an orbit.\n\n"
            "### Simple example\n"
            "Imagine placing a heavy ball on a stretched rubber sheet. The sheet bends around the ball. "
            "A smaller ball rolling nearby follows a curved path because of that deformation. Spacetime "
            "is not literally a rubber sheet, but the analogy helps visualize gravitational curvature.\n\n"
            "### Why it is important\n"
            "Relativity is important for understanding **black holes, gravitational waves, GPS, planetary motion, "
            "and the large-scale structure of the universe**."
        )
    return None


def _clean_retrieved_text(text: str) -> str:
    """Normalize extracted PDF text without changing its factual content."""
    text = re.sub(r"\s+", " ", text or "").strip()
    # Remove common PDF page markers/noise while preserving the note's wording.
    text = re.sub(r"\bTGPCET,\s*NagpurPage\s*\d+\b", "", text, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", text).strip()


def _deduplicate_retrieved_chunks(rag_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort retrieved chunks and remove duplicate/near-duplicate overlap."""
    ordered = sorted(
        rag_chunks,
        key=lambda item: (
            str(item.get("title", "")),
            int(item.get("chunk_index", 0) or 0),
        ),
    )
    result: List[Dict[str, Any]] = []
    seen = set()
    for item in ordered:
        cleaned = _clean_retrieved_text(str(item.get("text", "")))
        if not cleaned:
            continue
        fingerprint = re.sub(r"\W+", " ", cleaned.lower()).strip()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        copied = dict(item)
        copied["text"] = cleaned
        result.append(copied)
    return result


def _topic_label(text: str, index: int) -> str:
    """Infer a readable topic label from the retrieved note text."""
    patterns = [
        r"\b(Introduction to Java)\b",
        r"\b(Java Example)\b",
        r"\b(Application)\b",
        r"\b(Types of Java Applications)\b",
        r"\b(Java Platforms / Editions)\b",
        r"\b(History of Java)\b",
        r"\b(Java Version History)\b",
        r"\b(Features of Java)\b",
        r"\b(Data Types)\b",
        r"\b(Variables)\b",
        r"\b(Operators)\b",
        r"\b(Control structures)\b",
        r"\b(Selection statements)\b",
        r"\b(Looping)\b",
        r"\b(Java Methods)\b",
        r"\b(Method Overloading)\b",
        r"\b(Math Class)\b",
        r"\b(Arrays)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return f"Retrieved section {index}"


def _make_readable_paragraphs(text: str, max_sentences: int = 5) -> List[str]:
    """Break dense extracted note text into readable paragraphs."""
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return [text]
    paragraphs = []
    for start in range(0, len(sentences), max_sentences):
        paragraphs.append(" ".join(sentences[start : start + max_sentences]))
    return paragraphs


def rag_material_fallback(
    message: str,
    rag_chunks: List[Dict[str, Any]],
    model_status: str,
    retry_after_seconds: Optional[int],
) -> str:
    """Turn retrieved notes into a readable offline study answer when Gemini is unavailable."""
    chunks = _deduplicate_retrieved_chunks(rag_chunks)
    if not chunks:
        return "I found the study material, but it did not contain readable text."

    status_text = (
        "Gemini generation is temporarily unavailable because the API quota/rate limit has been reached."
        if model_status == "quota_exhausted"
        else "Gemini generation is temporarily unavailable."
    )
    retry_text = f" You can try the AI-generated version again after about {retry_after_seconds} seconds." if retry_after_seconds else ""

    # The fallback deliberately does not invent facts. It reformats the retrieved
    # source into a study-friendly outline so the student still gets useful notes.
    lines = [
        "## Study Material — Offline Mode",
        "",
        f"**{status_text}**{retry_text}",
        "",
        "I found the relevant content in your uploaded notes. I’m showing it in a cleaner, topic-by-topic study format so you can continue learning without waiting for Gemini.",
        "",
        "> **Note:** This answer is built only from the retrieved study material. No course-specific facts have been added.",
    ]

    used_labels = set()
    for index, item in enumerate(chunks, start=1):
        text = item["text"]
        label = _topic_label(text, index)
        if label in used_labels:
            label = f"{label} — continued"
        used_labels.add(label)
        title = item.get("title", "Study material")
        chunk_index = int(item.get("chunk_index", 0) or 0) + 1

        lines.extend([
            "",
            f"### {index}. {label}",
            f"**Source:** {title} · section {chunk_index}",
            "",
        ])
        paragraphs = _make_readable_paragraphs(text)
        for paragraph in paragraphs:
            lines.extend([paragraph, ""])

    source_titles = []
    seen_titles = set()
    for item in chunks:
        title = item.get("title", "Study material")
        if title not in seen_titles:
            seen_titles.add(title)
            source_titles.append(title)

    lines.extend(["### Sources", *[f"- {title}" for title in source_titles]])
    lines.extend([
        "",
        "When Gemini generation is available, EduNex will use these same retrieved sections to create the fuller beginner-friendly explanation automatically.",
    ])
    return "\n".join(lines)


def is_rag_question(message: str) -> bool:
    text = message.lower()
    phrases = [
        "study material", "study materials", "my notes", "our notes",
        "uploaded material", "uploaded notes", "according to the notes",
        "according to my notes", "from the pdf", "in the pdf", "from pdf",
        "in my pdf", "from the material", "in the material", "unit 1",
        "unit 2", "unit 3", "unit 4", "unit 5", "unit 6", "chapter",
        "lecture notes", "class notes", "explain this topic from",
    ]
    return any(phrase in text for phrase in phrases)


@app.get("/health")
def health():
    result = {
        "status": "ok",
        "llm_configured": bool(os.getenv("GEMINI_API_KEY")),
        "rag_available": RAG_AVAILABLE,
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
    }
    if RAG_AVAILABLE and collection_stats is not None:
        try:
            result["rag"] = collection_stats()
        except Exception as exc:
            result["rag_error"] = str(exc)
    return result


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    context = req.context
    history = req.history[-6:]

    if not message:
        return ChatResponse(reply="Please enter a question.", used_context=bool(context))

    rag_chunks: List[Dict[str, Any]] = []
    rag_requested = is_rag_question(message)

    if rag_requested and RAG_AVAILABLE and retrieve_materials is not None:
        try:
            rag_chunks = retrieve_materials(message, top_k=6)
        except Exception as exc:
            print(f"RAG retrieval error: {exc}")

    # A RAG question with no indexed sources should not silently become a
    # hallucinated course-specific answer.
    if rag_requested and not rag_chunks:
        return ChatResponse(
            reply=(
                "I couldn't find relevant content in the uploaded study materials. "
                "Please make sure the required PDF/DOCX has been uploaded and indexed, "
                "then try the question again."
            ),
            used_context=bool(context),
            used_rag=True,
            model_status="rag_no_match",
        )

    prompt = build_student_prompt(message, context, history, rag_chunks)
    llm_reply, model_status, retry_after_seconds = call_gemini(prompt)
    if llm_reply:
        sources = [
            {
                "title": item.get("title", "Study material"),
                "chunk": item.get("chunk_index", 0),
            }
            for item in rag_chunks
        ]
        return ChatResponse(
            reply=llm_reply,
            used_context=bool(context),
            used_rag=bool(rag_chunks),
            sources=sources,
            model_status="ok",
        )

    # If RAG retrieved material but Gemini cannot generate, never discard the
    # retrieved evidence. Return a readable offline study answer instead.
    if rag_chunks:
        sources = [
            {
                "title": item.get("title", "Study material"),
                "chunk": item.get("chunk_index", 0),
                "distance": item.get("distance"),
            }
            for item in rag_chunks
        ]
        return ChatResponse(
            reply=rag_material_fallback(message, rag_chunks, model_status, retry_after_seconds),
            used_context=bool(context),
            used_rag=True,
            sources=sources,
            model_status=model_status,
            retry_after_seconds=retry_after_seconds,
        )

    # Deterministic fallbacks keep dashboard questions useful when Gemini times out.
    lower = message.lower()
    if any(k in lower for k in ["attendance", "present", "absent"]):
        return ChatResponse(
            reply=generate_performance_insight(message, context),
            used_context=True,
            model_status=model_status,
            retry_after_seconds=retry_after_seconds,
        )

    if any(k in lower for k in ["mark", "ct1", "ct-1", "ct2", "ct-2", "performance"]):
        return ChatResponse(
            reply=generate_performance_insight(message, context),
            used_context=True,
            model_status=model_status,
            retry_after_seconds=retry_after_seconds,
        )

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
        return ChatResponse(
            reply="Here are your assignments:\n" + "\n".join(lines),
            used_context=True,
            model_status=model_status,
            retry_after_seconds=retry_after_seconds,
        )

    offline_reply = educational_fallback(message)
    if offline_reply:
        return ChatResponse(
            reply=offline_reply,
            used_context=False,
            model_status=model_status,
            retry_after_seconds=retry_after_seconds,
        )

    if model_status == "quota_exhausted":
        retry_text = f" Retry after about {retry_after_seconds} seconds." if retry_after_seconds else ""
        reply = (
            "## AI quota reached\n\n"
            "EduNex reached the current Gemini API quota, so a generated answer is temporarily unavailable."
            f"{retry_text}\n\n"
            "Your dashboard data and study materials are safe. Please try again after the quota resets or when your API plan has available generation capacity."
        )
    elif model_status == "connection_error":
        reply = "I couldn't connect to the Gemini AI service right now. Your dashboard data is safe. Please try again shortly."
    else:
        reply = "I couldn't generate the AI response right now. Your dashboard data is safe. Please try again shortly."

    return ChatResponse(
        reply=reply,
        used_context=bool(context),
        model_status=model_status,
        retry_after_seconds=retry_after_seconds,
    )


@app.post("/index-document")
def index_document_endpoint(req: IndexRequest):
    """Index already-extracted text supplied by the Node backend."""
    if not RAG_AVAILABLE or index_document is None:
        return {
            "chunks_indexed": 0,
            "rag_available": False,
            "message": "RAG dependencies are not available.",
        }

    try:
        chunks_indexed = index_document(req.subject_id, req.title, req.text)
        return {"chunks_indexed": chunks_indexed, "rag_available": True}
    except Exception as exc:
        print(f"RAG document indexing error: {exc}")
        return {"chunks_indexed": 0, "rag_available": True, "error": str(exc)}


@app.post("/index-file")
def index_file_endpoint(req: IndexFileRequest):
    """Extract and index an uploaded PDF/DOCX file from the shared local filesystem."""
    if not RAG_AVAILABLE or index_file is None:
        return {
            "chunks_indexed": 0,
            "rag_available": False,
            "message": "RAG dependencies are not available.",
        }

    try:
        chunks_indexed = index_file(req.subject_id, req.title, req.file_path)
        return {"chunks_indexed": chunks_indexed, "rag_available": True}
    except Exception as exc:
        print(f"RAG file indexing error: {exc}")
        return {"chunks_indexed": 0, "rag_available": True, "error": str(exc)}
