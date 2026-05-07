import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMClient:
    def __init__(self, model_name="gemini-flash-latest"):
        """
        Initializes the Gemini AI client.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found. Please set it in your .env file.")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)

    def create_completion(self, prompt):
        """
        Performs a synchronous generation request.
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error in Gemini completion: {e}")
            return f"Error: {str(e)}"

    def stream_completion(self, prompt):
        """
        Performs a streaming generation request, suitable for SSE.
        """
        try:
            response = self.model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Error in Gemini stream: {e}")
            yield f"\n[Error: {str(e)}]"

if __name__ == "__main__":
    # Quick sanity check
    try:
        client = LLMClient()
        print("Testing Sync Completion:")
        print(client.create_completion("What is a database index in one sentence?"))
        
        print("\nTesting Stream Completion:")
        for text in client.stream_completion("Write a 3-sentence summary of the relational model."):
            print(text, end="", flush=True)
        print()
    except Exception as e:
        print(f"Test failed: {e}")
