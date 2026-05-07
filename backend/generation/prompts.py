QA_PROMPT = """
You are a knowledgeable DBMS expert. Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Citing Sources:
- You MUST cite the sources in your response using numbered brackets like [1], [2], etc., corresponding to the context blocks provided.
- Do not cite a source if it doesn't support your statement.

CONTEXT:
{context_block}

USER QUERY:
{query}

ANSWER:
"""

QUIZ_MCQ_PROMPT = """
Based on the following DBMS textbook chunk from Chapter "{chapter}", generate ONE high-quality Multiple Choice Question (MCQ).
The question should test a conceptual understanding of the text.

CHUNK TEXT:
{chunk_text}

Output MUST be a raw JSON object with the following structure:
{{
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Brief explanation of why the correct option is right"
}}

RAW JSON:
"""

GRADE_PROMPT = """
You are a teaching assistant for a DBMS course. Grade the student's answer based on the provided reference answer and the source material.

SOURCE MATERIAL:
{chunk_text}

REFERENCE ANSWER:
{reference_answer}

STUDENT ANSWER:
{student_answer}

Output MUST be a raw JSON object with the following structure:
{{
    "score": 0-100,
    "feedback": "Concise feedback for the student",
    "missed_concepts": ["concept1", "concept2"]
}}

RAW JSON:
"""
