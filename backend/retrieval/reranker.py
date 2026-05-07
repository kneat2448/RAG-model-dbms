from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self, model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"):
        """
        Initializes the Cross-Encoder model for reranking.
        """
        print(f"Loading CrossEncoder model: {model_name}...")
        self.model = CrossEncoder(model_name)

    def rerank(self, query, chunks, top_n=5):
        """
        Reranks a list of chunks based on their relevance to the query.
        Returns the top_n most relevant chunks.
        """
        if not chunks:
            return []
        
        # Prepare pairs for the cross-encoder: (query, passage)
        pairs = [[query, chunk.get("content", "")] for chunk in chunks]
        
        # Predict relevance scores
        # Note: Higher score means more relevant
        scores = self.model.predict(pairs)
        
        # Attach scores to chunks
        for i, chunk in enumerate(chunks):
            chunk["rerank_score"] = float(scores[i])
            
        # Sort chunks by score in descending order
        sorted_chunks = sorted(chunks, key=lambda x: x.get("rerank_score", -100), reverse=True)
        
        return sorted_chunks[:top_n]

if __name__ == "__main__":
    # Quick sanity check
    reranker = Reranker()
    test_query = "How do B+ trees handle insertions?"
    test_chunks = [
        {"content": "B+ trees use a hierarchical structure for efficient search."},
        {"content": "When inserting into a B+ tree, a leaf split may occur if it overflows."},
        {"content": "Databases use various indexing methods like Hash and B+ trees."}
    ]
    results = reranker.rerank(test_query, test_chunks, top_n=2)
    print(f"\nQuery: {test_query}")
    for i, res in enumerate(results):
        print(f"Rank {i+1} (Score: {res['rerank_score']:.4f}): {res['content']}")
