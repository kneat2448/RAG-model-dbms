import chromadb
import os

class VectorStore:
    def __init__(self, db_path="data/chroma_db"):
        """
        Initializes the ChromaDB persistent client and the 'textbook' collection.
        """
        self.db_path = db_path
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=self.db_path)
        self.collection = self.client.get_or_create_collection(
            name="textbook",
            metadata={"description": "Chunks from the DBMS textbook"}
        )

    def add_batch(self, embeddings, documents, metadatas, ids):
        """
        Adds a batch of embeddings and documents to the collection.
        """
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def query_dense(self, query_vec, n_results=5, where_filter=None):
        """
        Wraps the collection query method for dense vector search.
        """
        return self.collection.query(
            query_embeddings=[query_vec],
            n_results=n_results,
            where=where_filter
        )

if __name__ == "__main__":
    # Quick sanity check
    vs = VectorStore()
    print(f"Collection 'textbook' initialized with {vs.collection.count()} documents.")
