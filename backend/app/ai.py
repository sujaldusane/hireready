import json
import os

import anthropic

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
CATEGORIES = {"technical", "behavioral", "role-specific"}

SYSTEM_PROMPT = """You are an experienced hiring manager and technical interviewer.
Given a job posting, write the interview questions a candidate is most likely to face.

Rules:
- Write a mix of categories: "technical", "behavioral", and "role-specific".
- Make questions specific to the skills, tools, and responsibilities in the posting.
  Avoid generic questions that could apply to any job.
- Respond with ONLY a JSON array and no other text. Each item must look like:
  {"category": "technical", "question": "..."}"""


class AIError(Exception):
    """Raised when the AI request fails or returns unusable output."""


def generate_interview_questions(company, role, job_description, count=8):
    prompt = (
        f"Company: {company}\n"
        f"Role: {role}\n\n"
        f"Job description:\n{job_description}\n\n"
        f"Write {count} interview questions."
    )

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise AIError(f"AI request failed: {exc}") from exc

    text = "".join(block.text for block in message.content if block.type == "text")
    return parse_questions(text)


def parse_questions(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIError("AI returned invalid JSON") from exc

    if not isinstance(data, list):
        raise AIError("AI response was not a list")

    questions = []
    for item in data:
        if not isinstance(item, dict) or not item.get("question"):
            continue
        category = item.get("category", "technical")
        if category not in CATEGORIES:
            category = "technical"
        questions.append({"category": category, "question": str(item["question"]).strip()})

    if not questions:
        raise AIError("AI returned no usable questions")
    return questions