import json
import os
import pickle
import numpy as np
import hashlib
import redis
from rank_bm25 import BM25Okapi
from nltk.tokenize import word_tokenize
from .vector_store import VectorStore
from ..ingestion.embedder import Embedder
from .reranker import Reranker

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

class HybridRetriever:
    def __init__(self, index_path="data/bm25_index.pkl", redis_host="localhost", redis_port=6379):
        """
        Orchestrates dense (vector) and sparse (BM25) retrieval, merges with RRF,
        and reranks with a Cross-Encoder. Includes Redis caching.
        """
        self.bm25_retriever = BM25Retriever(index_path)
        if not self.bm25_retriever.load_index():
            print("Warning: BM25 index could not be loaded. Sparse retrieval will be empty.")
            
        self.vector_store = VectorStore()
        # We reuse the Embedder's model for query embedding
        print("Initializing Embedder for query processing...")
        self.embedder = Embedder() 
        self.reranker = Reranker()
        
        # Initialize Redis
        try:
            self.redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            self.redis.ping()
            print("Redis connected successfully for caching.")
        except Exception as e:
            print(f"Redis connection failed: {e}. Caching will be disabled.")
            self.redis = None

    def _get_cache_key(self, query, chapter_filter):
        """Generates a unique cache key based on query and filter."""
        key_str = f"q:{query}|f:{chapter_filter}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def retrieve(self, query, chapter_filter=None, top_k=20):
        """
        Executes the full retrieval pipeline:
        1. Cache Check
        2. Dense + Sparse Retrieval (Top 20 each)
        3. RRF Merging
        4. Cross-Encoder Reranking (Top 40 -> Top 5)
        5. Cache Storage
        """
        # 1. Cache Check
        cache_key = self._get_cache_key(query, chapter_filter)
        if self.redis:
            cached_data = self.redis.get(cache_key)
            if cached_data:
                print(f"Cache hit for query: '{query}'")
                return json.loads(cached_data)

        # 2. Dense Retrieval
        print(f"Performing dense retrieval for: '{query}'...")
        query_vec = self.embedder.model.encode(query).tolist()
        
        # Prepare ChromaDB filter
        where_filter = {"chapter": chapter_filter} if chapter_filter else None
        
        dense_raw = self.vector_store.query_dense(query_vec, n_results=top_k, where_filter=where_filter)
        
        dense_chunks = []
        if dense_raw["ids"] and dense_raw["ids"][0]:
            for i in range(len(dense_raw["ids"][0])):
                dense_chunks.append({
                    "chunk_id": dense_raw["ids"][0][i],
                    "content": dense_raw["documents"][0][i],
                    "metadata": dense_raw["metadatas"][0][i]
                })

        # 3. Sparse Retrieval (BM25)
        print(f"Performing sparse retrieval for: '{query}'...")
        sparse_chunks = self.bm25_retriever.query(query, n_results=top_k)
        # Note: BM25 filter would need to be applied manually if needed, 
        # but for now we follow the user request for RRF merge.
        if chapter_filter:
            sparse_chunks = [c for c in sparse_chunks if c.get("chapter") == chapter_filter]

        # 4. RRF Merging (Reciprocal Rank Fusion)
        # score = Σ 1/(k+rank)
        k_rrf = 60
        rrf_scores = {} # chunk_id -> rrf_score
        chunk_map = {} # chunk_id -> chunk_data
        
        # Process Dense Ranks
        for rank, chunk in enumerate(dense_chunks):
            cid = chunk["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (k_rrf + rank + 1)
            chunk_map[cid] = chunk

        # Process Sparse Ranks
        for rank, chunk in enumerate(sparse_chunks):
            cid = chunk["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (k_rrf + rank + 1)
            if cid not in chunk_map:
                chunk_map[cid] = {
                    "chunk_id": cid,
                    "content": chunk["content"],
                    "metadata": {
                        "chapter": chunk.get("chapter"),
                        "section": chunk.get("section"),
                        "page_start": chunk.get("page_start"),
                        "page_end": chunk.get("page_end")
                    }
                }

        # Sort by RRF score
        merged_results = sorted(chunk_map.values(), key=lambda x: rrf_scores[x["chunk_id"]], reverse=True)
        print(f"Merged {len(merged_results)} unique chunks using RRF.")

        # 5. Reranking (Top 40 merged -> Top 5 final)
        print(f"Reranking top {len(merged_results)} results...")
        final_results = self.reranker.rerank(query, merged_results, top_n=5)
        
        # 6. Cache Storage
        if self.redis:
            self.redis.setex(cache_key, 3600, json.dumps(final_results))
            
        return final_results

if __name__ == "__main__":
    # Test Hybrid Retrieval
    hr = HybridRetriever()
    test_q = "Explain the concepts of atomicity and durability in transactions"
    
    print("\n--- Testing Hybrid Retrieval Pipeline ---")
    results = hr.retrieve(test_q)
    
    for i, res in enumerate(results):
        print(f"\n[Rank {i+1}] (Rerank Score: {res.get('rerank_score', 0):.4f})")
        print(f"Page: {res['metadata'].get('page_start')} | Chapter: {res['metadata'].get('chapter')}")
        print(f"Snippet: {res['content'][:200]}...")
