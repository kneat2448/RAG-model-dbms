import uuid
import tiktoken
import json
from nltk.tokenize import sent_tokenize
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings

class Chunker:
    def __init__(self, target_min=400, target_max=600, overlap=60):
        self.target_min = target_min
        self.target_max = target_max
        self.overlap = overlap
        # Initialize tiktoken encoder
        self.encoder = tiktoken.get_encoding("cl100k_base")
        # Initialize embeddings for semantic chunking
        print("Initializing Embedding Model for Semantic Chunking...")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.semantic_splitter = SemanticChunker(
            self.embeddings,
            breakpoint_threshold_type="percentile"
        )

    def count_tokens(self, text):
        return len(self.encoder.encode(text))

    def process(self, pages_data):
        """
        Takes list of pages and returns list of chunks with metadata.
        """
        full_text = ""
        offsets = []
        curr_idx = 0
        for p in pages_data:
            start = curr_idx
            text_to_add = p["text"] + "\n\n"
            full_text += text_to_add
            curr_idx += len(text_to_add)
            offsets.append((start, curr_idx, p))

        print(f"Performing Semantic Chunking on {len(pages_data)} pages...")
        semantic_docs = self.semantic_splitter.create_documents([full_text])
        
        chunks = []
        for doc in semantic_docs:
            content = doc.page_content.strip()
            if not content:
                continue
                
            token_count = self.count_tokens(content)
            
            # If semantic chunk is too large, refine it using token limits
            if token_count > self.target_max:
                sub_chunks = self._refine_split(content)
                for sub in sub_chunks:
                    chunks.append(self._attach_metadata(sub, full_text, offsets))
            elif token_count < self.target_min / 2 and chunks:
                # Merge very small semantic chunks into previous if possible
                prev_chunk = chunks[-1]
                if self.count_tokens(prev_chunk["content"] + content) <= self.target_max:
                    prev_chunk["content"] += "\n" + content
                    # Update page_end
                    _, page_end_info = self._get_metadata_for_range(full_text.find(content), full_text.find(content) + len(content), offsets)
                    prev_chunk["page_end"] = page_end_info["page"]
                else:
                    chunks.append(self._attach_metadata(content, full_text, offsets))
            else:
                chunks.append(self._attach_metadata(content, full_text, offsets))
                
        return chunks

    def _refine_split(self, text):
        """
        Splits text into chunks of target_max tokens, respecting sentence boundaries.
        """
        sentences = sent_tokenize(text)
        refined = []
        curr_text = ""
        curr_tokens = 0
        
        for sent in sentences:
            sent_tokens = self.count_tokens(sent)
            if curr_tokens + sent_tokens > self.target_max:
                if curr_text:
                    refined.append(curr_text.strip())
                # Start new chunk
                curr_text = sent
                curr_tokens = sent_tokens
            else:
                curr_text += " " + sent
                curr_tokens += sent_tokens
                
        if curr_text:
            refined.append(curr_text.strip())
        return refined

    def _attach_metadata(self, content, full_text, offsets):
        start_pos = full_text.find(content)
        end_pos = start_pos + len(content)
        
        start_info, end_info = self._get_metadata_for_range(start_pos, end_pos, offsets)
        
        return {
            "chunk_id": str(uuid.uuid4()),
            "content": content,
            "chapter": start_info["chapter"],
            "section": start_info["section"],
            "page_start": start_info["page"],
            "page_end": end_info["page"]
        }

    def _get_metadata_for_range(self, start_pos, end_pos, offsets):
        start_info = {"page": 0, "chapter": "Unknown", "section": "Unknown"}
        end_info = {"page": 0}
        
        for s, e, p in offsets:
            if s <= start_pos < e:
                start_info = p
            if s < end_pos <= e:
                end_info = p
                
        if end_info["page"] == 0:
            end_info = start_info
            
        return start_info, end_info

if __name__ == "__main__":
    # Test logic
    test_pages = [
        {"text": "This is page 1 content. " * 50, "page": 1, "chapter": "Ch 1", "section": "Sec 1"},
        {"text": "This is page 2 content. " * 50, "page": 2, "chapter": "Ch 1", "section": "Sec 2"}
    ]
    chunker = Chunker()
    res = chunker.process(test_pages)
    print(f"Generated {len(res)} chunks")
    print(json.dumps(res[0], indent=2))
