import json
import os
import tqdm
from sentence_transformers import SentenceTransformer
from ..retrieval.vector_store import VectorStore

class Embedder:
    def __init__(self, model_name="all-mpnet-base-v2"):
        """
        Initializes the embedding model and the vector store.
        """
        print(f"Loading embedding model: {model_name} (this may take a moment)...")
        self.model = SentenceTransformer(model_name)
        self.vector_store = VectorStore()
        self.checkpoint_path = "data/embed_checkpoint.txt"
        os.makedirs("data", exist_ok=True)

    def get_checkpoint(self):
        """Reads the last processed line index from the checkpoint file."""
        if os.path.exists(self.checkpoint_path):
            try:
                with open(self.checkpoint_path, "r") as f:
                    return int(f.read().strip())
            except ValueError:
                return 0
        return 0

    def save_checkpoint(self, index):
        """Saves the current line index to the checkpoint file."""
        with open(self.checkpoint_path, "w") as f:
            f.write(str(index))

    def run(self, input_path="data/chunks/chunks.jsonl", batch_size=64):
        """
        Processes chunks in batches, embeds them, and adds them to ChromaDB.
        """
        if not os.path.exists(input_path):
            print(f"Error: {input_path} not found. Run ingestion pipeline first.")
            return

        checkpoint = self.get_checkpoint()
        
        with open(input_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        total_lines = len(lines)
        if checkpoint >= total_lines:
            print(f"All {total_lines} chunks are already processed.")
            return

        print(f"Processing {total_lines - checkpoint} chunks starting from index {checkpoint}...")
        
        for i in range(checkpoint, total_lines, batch_size):
            batch_lines = lines[i:i+batch_size]
            
            documents = []
            metadatas = []
            ids = []
            
            for line in batch_lines:
                try:
                    data = json.loads(line)
                    documents.append(data["content"])
                    # Clean up metadata for ChromaDB (only simple types allowed)
                    metadatas.append({
                        "chapter": data.get("chapter", "Unknown"),
                        "section": data.get("section", "Unknown"),
                        "page_start": data.get("page_start", 0),
                        "page_end": data.get("page_end", 0)
                    })
                    ids.append(data["chunk_id"])
                except Exception as e:
                    print(f"Error parsing line {i}: {e}")
                    continue

            # Generate embeddings
            embeddings = self.model.encode(documents, show_progress_bar=False).tolist()
            
            # Add to vector store
            self.vector_store.add_batch(
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            # Update checkpoint
            new_checkpoint = i + len(batch_lines)
            self.save_checkpoint(new_checkpoint)
            print(f"Batch complete: {new_checkpoint}/{total_lines} processed.")

if __name__ == "__main__":
    embedder = Embedder()
    embedder.run()
