import fitz
import pytesseract
from PIL import Image
import re
from collections import Counter

class PDFParser:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        try:
            self.doc = fitz.open(pdf_path)
        except Exception as e:
            print(f"Error opening PDF: {e}")
            raise
        self.toc = self.doc.get_toc()
        
    def get_toc_metadata(self, page_num):
        """
        Maps page number to current chapter and section based on TOC.
        fitz TOC format: [lvl, title, page_num] (page_num is 1-indexed)
        """
        current_chapter = "Unknown"
        current_section = "Introduction"
        
        for lvl, title, page in self.toc:
            if page <= page_num + 1:
                if lvl == 1:
                    current_chapter = title
                    current_section = "Main"
                elif lvl == 2:
                    current_section = title
            else:
                break
        return current_chapter, current_section

    def extract_pages(self):
        pages_data = []
        for i, page in enumerate(self.doc):
            text = page.get_text().strip()
            
            # OCR Fallback: if text is too short, try OCR
            if len(text) < 50:
                try:
                    pix = page.get_pixmap()
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    text = pytesseract.image_to_string(img).strip()
                except Exception as e:
                    print(f"OCR failed on page {i+1}: {e}")
            
            chapter, section = self.get_toc_metadata(i)
            pages_data.append({
                "page": i + 1,
                "text": text,
                "chapter": chapter,
                "section": section
            })
        
        pages_data = self.strip_artifacts(pages_data)
        return pages_data

    def strip_artifacts(self, pages_data):
        """
        Removes repeating headers and footers detected across 3+ consecutive pages.
        """
        if len(pages_data) < 3:
            return pages_data
            
        header_candidates = []
        footer_candidates = []
        
        for p in pages_data:
            lines = [l.strip() for l in p["text"].split('\n') if l.strip()]
            if lines:
                header_candidates.append(lines[0])
                footer_candidates.append(lines[-1])
            else:
                header_candidates.append(None)
                footer_candidates.append(None)
                
        def find_repeating(candidates):
            to_remove = set()
            count = 0
            last_val = None
            for val in candidates:
                if val and val == last_val:
                    count += 1
                else:
                    if count >= 3:
                        to_remove.add(last_val)
                    count = 1
                    last_val = val
            if count >= 3:
                to_remove.add(last_val)
            return to_remove

        headers_to_remove = find_repeating(header_candidates)
        footers_to_remove = find_repeating(footer_candidates)
        
        for p in pages_data:
            lines = p["text"].split('\n')
            if not lines: continue
            
            new_lines = []
            for i, line in enumerate(lines):
                clean_line = line.strip()
                if i == 0 and clean_line in headers_to_remove:
                    continue
                if i == len(lines) - 1 and clean_line in footers_to_remove:
                    continue
                new_lines.append(line)
            p["text"] = '\n'.join(new_lines).strip()
            
        return pages_data

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        parser = PDFParser(sys.argv[1])
        pages = parser.extract_pages()
        for p in pages[:5]:
            print(f"--- Page {p['page']} ({p['chapter']} | {p['section']}) ---")
            print(p['text'][:200] + "...")
