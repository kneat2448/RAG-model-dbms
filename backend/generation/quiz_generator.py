import random
import json
from ..retrieval.vector_store import VectorStore
from .llm_client import LLMClient
from .prompts import QUIZ_MCQ_PROMPT

class QuizGenerator:
    def __init__(self):
        """
        Initializes the QuizGenerator with VectorStore and LLMClient.
        """
        self.vector_store = VectorStore()
        self.llm = LLMClient()

    def generate_quiz(self, chapter_id, n=5):
        """
        Generates a quiz by fetching random chunks from a specific chapter 
        and calling the LLM to create MCQs.
        """
        # Fetch chunks from the specified chapter
        # Note: chapter_id should match the 'chapter' metadata in ChromaDB
        results = self.vector_store.collection.get(
            where={"chapter": chapter_id}
        )
        
        documents = results.get("documents", [])
        ids = results.get("ids", [])
        if not documents:
            print(f"No documents found for chapter: {chapter_id}")
            # Fallback: if 'Unknown' exists or just get any
            return []

        # Select n random chunks (or fewer if total chunks < n)
        n_to_pick = min(n, len(documents))
        selected_indices = random.sample(range(len(documents)), n_to_pick)
        selected_chunks = [(documents[i], ids[i]) for i in selected_indices]
        
        quiz = []
        print(f"Generating {n_to_pick} MCQs for chapter: {chapter_id}...")
        
        for chunk_text, chunk_id in selected_chunks:
            prompt = QUIZ_MCQ_PROMPT.format(
                chapter=chapter_id,
                chunk_text=chunk_text
            )
            
            response = self.llm.create_completion(prompt)
            
            # Extract JSON from response (handling potential markdown blocks)
            try:
                # Basic cleanup
                clean_response = response.strip()
                if "```json" in clean_response:
                    clean_response = clean_response.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_response:
                    clean_response = clean_response.split("```")[1].strip()
                
                mcq_data = json.loads(clean_response)
                mcq_data["chunk_id"] = chunk_id
                quiz.append(mcq_data)
            except (json.JSONDecodeError, IndexError) as e:
                print(f"Error parsing MCQ response: {e}\nResponse: {response}")
                continue
                
        return quiz

if __name__ == "__main__":
    # Test Quiz Generation
    qg = QuizGenerator()
    # Using 'Cover' as a test chapter ID if it exists, otherwise 'Introduction'
    chapter = "Chapter 1 Introduction" 
    quiz_results = qg.generate_quiz(chapter, n=2)
    
    print(f"\n--- Quiz for {chapter} ---")
    for i, q in enumerate(quiz_results):
        print(f"\nQ{i+1}: {q.get('question')}")
        for idx, opt in enumerate(q.get("options", [])):
            print(f"  {chr(65+idx)}. {opt}")
        print(f"Correct: {q.get('correct_index')} | Explanation: {q.get('explanation')}")
