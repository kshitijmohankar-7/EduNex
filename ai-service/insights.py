"""
Generates plain-language explanations of a student's authorized academic data.
Never invents figures - only reasons over what's passed in `context` by the Node backend.
"""
from typing import Dict, Any


def generate_performance_insight(question: str, context: Dict[str, Any]) -> str:
    marks = context.get("marks", [])
    attendance = context.get("attendance", [])

    if "attendance" in question and attendance:
        lines = []
        for a in attendance:
            present, total = a.get("present", 0), a.get("total", 0)
            pct = round((present / total) * 100, 1) if total else 0
            lines.append(f"{a['subject']}: {pct}% ({present}/{total} classes)")
        return "Here's your attendance by subject:\n" + "\n".join(lines)

    if any(k in question for k in ["ct-1", "ct1", "ct-2", "ct2", "marks", "performance"]) and marks:
        lines = [f"{m['subject']} ({m['exam_type']}): {m['obtained_marks']}/{m['max_marks']}" for m in marks]
        return "Here are your published marks:\n" + "\n".join(lines)

    if not marks and not attendance:
        return "I don't see any published marks or attendance records for you yet."

    return "I have your marks and attendance on file — ask me about a specific subject or exam and I'll break it down."
