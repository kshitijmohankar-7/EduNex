"""
Generates deterministic explanations of a student's authorized academic data.
Never invents figures - only reasons over what's passed in `context` by the Node backend.
"""
from typing import Any, Dict, List


def _attendance_rows(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Accept both the current {overallPercentage, bySubject} shape and older list shape."""
    attendance = context.get("attendance", [])

    if isinstance(attendance, dict):
        rows = attendance.get("bySubject", [])
        return rows if isinstance(rows, list) else []

    return attendance if isinstance(attendance, list) else []


def generate_performance_insight(question: str, context: Dict[str, Any]) -> str:
    marks = context.get("marks", [])
    attendance = _attendance_rows(context)
    lower = question.lower()

    if "attendance" in lower and attendance:
        overall = context.get("attendance", {})
        overall_pct = overall.get("overallPercentage") if isinstance(overall, dict) else None

        lines = []
        for item in attendance:
            if not isinstance(item, dict):
                continue
            present = int(item.get("present", 0) or 0)
            total = int(item.get("total", 0) or 0)
            pct = item.get("percentage")
            if pct is None:
                pct = round((present / total) * 100, 1) if total else 0
            subject = item.get("subject", "Unknown subject")
            code = item.get("code")
            label = f"{subject} ({code})" if code else subject
            lines.append(f"- {label}: {pct}% ({present}/{total} classes)")

        result = "Here's your attendance by subject:\n" + "\n".join(lines)
        if overall_pct is not None:
            result += f"\n\n**Overall attendance: {overall_pct}%**"
        return result

    if isinstance(marks, list) and any(
        k in lower for k in ["ct-1", "ct1", "ct-2", "ct2", "marks", "performance"]
    ) and marks:
        lines = []
        for item in marks:
            if not isinstance(item, dict):
                continue
            lines.append(
                f"- {item.get('subject', 'Subject')} ({item.get('exam_type', 'Exam')}): "
                f"{item.get('obtained_marks', 0)}/{item.get('max_marks', 0)}"
            )
        return "Here are your published marks:\n" + "\n".join(lines)

    if not marks and not attendance:
        return "I don't see any published marks or attendance records for you yet."

    return "I have your marks and attendance on file — ask me about a specific subject or exam and I'll break it down."
