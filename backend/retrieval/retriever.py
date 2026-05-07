import json
import os
import pickle
import numpy as np
from rank_bm25 import BM25Okapi
from nltk.tokenize import word_tokenize

class BM25Retriever:
    def __init__(self, index_path="data/bm25_index.pkl"):
        """
        Handles BM25 indexing and querying for keyword-based retrieval.
        """
        self.index_path = index_path
        self.index = None
        self.chunks = []

    def _tokenize(self, text):
        """Simple tokenization: lowercase and word tokens."""
        return word_tokenize(text.lower())

    def build_index(self, input_path="data/chunks/chunks.jsonl"):
        """
        Reads all chunks from JSONL, tokenizes them, and builds the BM25 index.
        """
        if not os.path.exists(input_path):
            print(f"Error: {input_path} not found.")
            return

        print("Building BM25 Index (reading all chunks)...")
        with open(input_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    self.chunks.append(data)
                except Exception as e:
                    continue
        
        print(f"Tokenizing {len(self.chunks)} chunks for BM25...")
        tokenized_corpus = [self._tokenize(c["content"]) for c in self.chunks]
        
        print("Initializing BM25Okapi...")
        self.index = BM25Okapi(tokenized_corpus)
        
        # Save both the index and the source chunks for retrieval
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        with open(self.index_path, "wb") as f:
            pickle.dump({"index": self.index, "chunks": self.chunks}, f)
        print(f"BM25 Index saved to {self.index_path}")

    def load_index(self):
        """Loads the pickled index from disk."""
        if not os.path.exists(self.index_path):
            print(f"Index not found at {self.index_path}. You may need to build it first.")
            return False
        
        with open(self.index_path, "rb") as f:
            data = pickle.load(f)
            self.index = data["index"]
            self.chunks = data["chunks"]
        return True

    def query(self, query_text, n_results=5):
        """
        Performs a keyword search and returns top N chunks.
        """
        if self.index is None:
            if not self.load_index():
                return []
        
        tokenized_query = self._tokenize(query_text)
        scores = self.index.get_scores(tokenized_query)
        
        # Get top indices using numpy for efficiency
        top_indices = np.argsort(scores)[::-1][:n_results]
        
        results = []
        for i in top_indices:
            # Only include results with some positive score
            if scores[i] > 0:
                results.append(self.chunks[i])
        
        return results

if __name__ == "__main__":
    retriever = BM25Retriever()
    # Check if index exists, if not build it
    if not os.path.exists(retriever.index_path):
        retriever.build_index()
    else:
        print("Index already exists. Loading...")
        retriever.load_index()
        
    # Simple test query
    test_q = "What is a relational database?"
    results = retriever.query(test_q, n_results=2)
    print(f"\nTest Query: {test_q}")
    for i, res in enumerate(results):
        print(f"Result {i+1} (Page {res.get('page_start')}): {res['content'][:100]}...")
