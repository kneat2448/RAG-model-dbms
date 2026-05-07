import argparse
import os
import json
from .pdf_parser import PDFParser
from .chunker import Chunker

def main():
    parser = argparse.ArgumentParser(description="Ingest a PDF and generate chunks.")
    parser.add_argument("--pdf", type=str, required=True, help="Path to the PDF file")
    parser.add_argument("--output", type=str, default="data/chunks/chunks.jsonl", help="Output JSONL file")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf):
        print(f"Error: File {args.pdf} not found.")
        return

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    print(f"--- Starting Ingestion Pipeline for {args.pdf} ---")
    
    # 1. Parse PDF
    print("Parsing PDF...")
    pdf_parser = PDFParser(args.pdf)
    pages_data = pdf_parser.extract_pages()
    print(f"Extracted {len(pages_data)} pages.")

    # 2. Chunk Data
    print("Chunking pages...")
    chunker = Chunker(target_min=400, target_max=600, overlap=60)
    chunks = chunker.process(pages_data)
    print(f"Generated {len(chunks)} chunks.")

    # 3. Save to JSONL
    print(f"Saving to {args.output}...")
    with open(args.output, "a", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
            
    print("Done!")

if __name__ == "__main__":
    main()
