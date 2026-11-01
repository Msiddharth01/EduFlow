#!/usr/bin/env python3
"""
EduFlow Robust Multi-Stage PDF Text Extraction & Quality Validation Pipeline
- Stage 1: Normal digital text extraction page-by-page preserving reading order, headings, and code.
- Stage 2: Automatic OCR fallback for pages lacking digital text, using PIL contrast enhancement and Tesseract.
- Stage 3: Multi-dimensional extraction quality validation (valid word ratio, technical terminology detection, affected pages tracking).
- Accurate status reporting: reports readable vs unreadable pages and specific missing dependencies.
"""

import sys
import os
import json
import tempfile
import subprocess
import shutil
import re

# Load system dictionary if available
SYSTEM_DICT = set()
for dict_path in ['/usr/share/dict/words', '/usr/dict/words']:
    if os.path.isfile(dict_path):
        try:
            with open(dict_path, 'r', encoding='utf-8', errors='ignore') as f:
                SYSTEM_DICT = set(line.strip().lower() for line in f if len(line.strip()) >= 2)
            break
        except Exception:
            pass

# Common academic, computer science, web development, and engineering terminology
TECH_DICT = {
    'css', 'html', 'dom', 'id', 'class', 'div', 'span', 'href', 'src', 'px', 'em', 'rem', 'rgba', 'rgb', 'hsl',
    'flex', 'grid', 'table', 'color', 'background', 'image', 'url', 'font', 'size', 'weight', 'style', 'margin',
    'padding', 'border', 'width', 'height', 'display', 'position', 'absolute', 'relative', 'fixed', 'sticky',
    'float', 'clear', 'overflow', 'media', 'query', 'screen', 'box', 'sizing', 'shadow', 'radius', 'transition',
    'animation', 'transform', 'selector', 'element', 'attribute', 'pseudo', 'hover', 'active', 'focus', 'link',
    'visited', 'before', 'after', 'first', 'last', 'child', 'website', 'page', 'text', 'code', 'section', 'chapter',
    'sql', 'dbms', 'rdbms', 'database', 'query', 'select', 'from', 'where', 'insert', 'update', 'delete', 'join',
    'inner', 'outer', 'left', 'right', 'group', 'order', 'having', 'limit', 'index', 'key', 'primary', 'foreign',
    'unique', 'check', 'default', 'cascade', 'transaction', 'commit', 'rollback', 'cursor', 'procedure', 'trigger',
    'view', 'entity', 'normalization', 'denormalization', 'schema', 'postgres', 'postgresql', 'mysql', 'sqlite',
    'mongodb', 'redis', 'nosql', 'frontend', 'backend', 'javascript', 'typescript', 'python', 'java', 'react',
    'nextjs', 'node', 'express', 'crud', 'rest', 'graphql', 'devops', 'git', 'github', 'docker', 'ui', 'ux', 'api'
}

ALL_VOCABULARY = SYSTEM_DICT | TECH_DICT
COMMON_SUFFIXES = ('ing', 'ed', 'tion', 'ment', 'able', 'ive', 'ness', 'ity', 'ize', 'ise', 'ally', 'er', 'or', 'ic', 'al', 'ly')

def find_tesseract():
    common_paths = [
        '/opt/homebrew/bin/tesseract',
        '/usr/local/bin/tesseract',
        '/usr/bin/tesseract'
    ]
    for p in common_paths:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    which_p = shutil.which('tesseract')
    if which_p:
        return which_p
    return None

def clean_text(text):
    """Clean extracted text from headers, footers, watermarks, and formatting artifacts."""
    if not text:
        return ""

    # Strip null bytes and non-printable control chars, keeping newlines & tabs
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # Remove common social media promotional watermarks & handles
    text = re.sub(r'(?i)@[\w_]+(\s*\|\s*[\w\s,!]+)?', '', text)
    text = re.sub(r'(?i)\b(swipe to next|follow\s*\|\s*share\s*\|\s*like|subscribe|all rights reserved)\b.*', '', text)

    # Remove notebook ruled line headers like "classmate", "Date :", "Page :"
    text = re.sub(r'(?i)^\s*(classmate|date\s*[:\-]|page\s*(no\.?)?\s*[:\-])\s*.*$', '', text, flags=re.MULTILINE)

    # Remove standalone running page numbers: "Page 1", "- 1 -", "1 of 20"
    text = re.sub(r'(?i)^\s*(page\s*\d+(\s*of\s*\d+)?|\-?\s*\d+\s*\-?)\s*$', '', text, flags=re.MULTILINE)

    # Remove excessive horizontal rules, pipes, underscores, tildes
    text = re.sub(r'[\|\_\—\–\~=]{3,}', ' ', text)

    # Clean non-ASCII noise glyphs commonly produced by failed OCR
    text = re.sub(r'[¢®©™¥€¡«»°]+', ' ', text)

    # Rejoin broken hyphenated line endings: "inter-\nnational" -> "international"
    text = re.sub(r'(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)', r'\1\2', text)

    # Clean isolated line-art blocks (bracket or symbol spam)
    cleaned_lines = []
    for line in text.split('\n'):
        line_clean = line.strip()
        if line_clean and len(line_clean) > 3:
            alnum_in_line = len(re.findall(r'[a-zA-Z0-9]', line_clean))
            if alnum_in_line / len(line_clean) < 0.30 and len(line_clean) > 8:
                continue
        cleaned_lines.append(line)
    text = '\n'.join(cleaned_lines)

    # Normalize whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()

def evaluate_quality(text, is_digital=True):
    """
    Evaluate readability, sentence coherence, and quality of extracted text.
    Returns: (word_count, valid_word_ratio, alnum_ratio, is_usable, reason)
    """
    if not text or len(text.strip()) < 15:
        return 0, 0.0, 0.0, False, "Page text is empty or too short."

    # Extract all alphabetical words
    words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{2,}\b', text)]
    min_words = 12 if is_digital else 10
    if len(words) < min_words:
        return len(words), 0.0, 0.0, False, f"Too few word tokens ({len(words)} < {min_words})."

    # Single-letter token ratio (non 'a'/'i')
    all_tokens = [w.lower() for w in re.findall(r'\b[a-zA-Z]+\b', text)]
    single_letters = [w for w in all_tokens if len(w) == 1 and w not in ('a', 'i')]
    if len(all_tokens) > 0 and (len(single_letters) / len(all_tokens) > 0.15):
        return len(words), 0.0, 0.0, False, f"Excessive single-character noise artifacts ({len(single_letters)}/{len(all_tokens)})."

    # Count dictionary / vocabulary words
    valid_words = 0
    has_tech_keyword = False
    for w in words:
        if w in TECH_DICT:
            has_tech_keyword = True
            valid_words += 1
        elif w in ALL_VOCABULARY or (len(w) >= 3 and any(w.endswith(sfx) for sfx in COMMON_SUFFIXES)):
            valid_words += 1

    valid_ratio = valid_words / len(words) if words else 0.0

    # Calculate alphanumeric ratio among non-whitespace chars
    chars = [c for c in text if not c.isspace()]
    alnum_ratio = (sum(1 for c in chars if c.isalnum()) / len(chars)) if chars else 0.0

    # For digital text
    if is_digital:
        is_ok = (valid_ratio >= 0.45 and len(words) >= 12) or (has_tech_keyword and len(words) >= 10 and valid_ratio >= 0.35)
        return len(words), valid_ratio, alnum_ratio, is_ok, "Digital text validated" if is_ok else "Insufficient dictionary density"

    # For OCR text: allow recognized technical terminology and handwriting with >= 35% density
    is_ok = (valid_ratio >= 0.40 and len(words) >= 12) or (has_tech_keyword and len(words) >= 10 and valid_ratio >= 0.35)
    return len(words), valid_ratio, alnum_ratio, is_ok, "OCR text validated" if is_ok else "OCR text failed coherence"

def preprocess_and_ocr_page(page, tesseract_bin):
    """Render page at high DPI, apply contrast enhancement, and run OCR with automatic page segmentation."""
    try:
        from PIL import Image, ImageEnhance

        # Render page at scale 2.5 (approx 200-240 DPI)
        pil_image = page.render(scale=2.5).to_pil().convert('L')

        # Enhance contrast without harsh binarization to preserve cursive strokes
        enhancer = ImageEnhance.Contrast(pil_image)
        pil_image = enhancer.enhance(1.6)

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            pil_image.save(tmp.name)
            tmp_path = tmp.name

        try:
            proc = subprocess.run(
                [tesseract_bin, tmp_path, 'stdout', '-l', 'eng', '--psm', '3'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30
            )
            raw_ocr = proc.stdout
            return raw_ocr
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    except Exception as err:
        sys.stderr.write(f"OCR preprocessing error: {str(err)}\n")
        return ""

def extract_pdf_document(pdf_path):
    """
    Multi-stage extraction pipeline:
    Stage 1: Normal digital text extraction page-by-page.
    Stage 2: OCR fallback for pages lacking digital text.
    Stage 3: Extraction validation and affected page tracking.
    """
    tesseract_bin = find_tesseract()
    results = []
    total_pages = 0

    use_pdfium = False
    try:
        import pypdfium2
        use_pdfium = True
    except ImportError:
        pass

    if use_pdfium:
        try:
            import pypdfium2
            pdf = pypdfium2.PdfDocument(pdf_path)
            total_pages = len(pdf)

            for idx in range(total_pages):
                page_num = idx + 1
                page = pdf[idx]

                # Stage 1: Digital text extraction
                digital_raw = ""
                try:
                    textpage = page.get_textpage()
                    digital_raw = textpage.get_text_range() or ""
                except Exception:
                    pass

                cleaned_digital = clean_text(digital_raw)
                w_count, w_ratio, a_ratio, is_usable, reason = evaluate_quality(cleaned_digital, is_digital=True)

                if is_usable:
                    results.append({
                        "pageNumber": page_num,
                        "text": cleaned_digital,
                        "source": "digital",
                        "isReadable": True,
                        "wordCount": w_count,
                        "qualityScore": round(w_ratio, 2)
                    })
                    continue

                # Stage 2: OCR Fallback if page lacks usable digital text
                if tesseract_bin:
                    ocr_raw = preprocess_and_ocr_page(page, tesseract_bin)
                    cleaned_ocr = clean_text(ocr_raw)
                    ocr_w_count, ocr_w_ratio, ocr_a_ratio, ocr_usable, ocr_reason = evaluate_quality(cleaned_ocr, is_digital=False)

                    if ocr_usable:
                        results.append({
                            "pageNumber": page_num,
                            "text": cleaned_ocr,
                            "source": "ocr",
                            "isReadable": True,
                            "wordCount": ocr_w_count,
                            "qualityScore": round(ocr_w_ratio, 2)
                        })
                        continue

                # Stage 3: Page is unreadable / blank / low contrast
                results.append({
                    "pageNumber": page_num,
                    "text": "",
                    "source": "failed",
                    "isReadable": False,
                    "wordCount": 0,
                    "qualityScore": 0.0
                })

        except Exception as e:
            sys.stderr.write(f"pypdfium2 processing error: {str(e)}\n")

    # Fallback to pypdf if pypdfium2 failed or was not installed
    if not results:
        try:
            import pypdf
            reader = pypdf.PdfReader(pdf_path)
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                raw_text = ""
                try:
                    raw_text = page.extract_text() or ""
                except Exception:
                    pass

                cleaned = clean_text(raw_text)
                w_count, w_ratio, a_ratio, is_usable, reason = evaluate_quality(cleaned, is_digital=True)
                if is_usable:
                    results.append({
                        "pageNumber": page_num,
                        "text": cleaned,
                        "source": "digital",
                        "isReadable": True,
                        "wordCount": w_count,
                        "qualityScore": round(w_ratio, 2)
                    })
                else:
                    results.append({
                        "pageNumber": page_num,
                        "text": "",
                        "source": "failed",
                        "isReadable": False,
                        "wordCount": 0,
                        "qualityScore": 0.0
                    })
        except Exception as e:
            sys.stderr.write(f"pypdf fallback error: {str(e)}\n")

    # Aggregate metrics
    readable_pages = [p for p in results if p["isReadable"]]
    unreadable_pages = [p for p in results if not p["isReadable"]]
    affected_page_numbers = [p["pageNumber"] for p in unreadable_pages]
    readable_page_numbers = [p["pageNumber"] for p in readable_pages]
    total_valid_words = sum(p["wordCount"] for p in readable_pages)

    # Document is usable if at least 1 page is readable
    is_doc_usable = len(readable_pages) > 0 and total_valid_words >= 25

    failure_reason = None
    notice_message = None

    if not is_doc_usable:
        if not tesseract_bin:
            failure_reason = (
                f"Document extraction failed: OCR dependency missing. The PDF requires OCR processing, but the 'tesseract' binary "
                f"was not found on the system path. Please install Tesseract on the server."
            )
        else:
            failure_reason = (
                f"Document extraction failed: All {total_pages} pages in this PDF produced zero readable characters. "
                f"The document may be corrupted, password-protected, or contain completely blank pages."
            )
    else:
        if len(affected_page_numbers) > 0:
            notice_message = (
                f"Successfully extracted {len(readable_pages)} of {total_pages} pages ({total_valid_words} words). "
                f"Note: Pages {', '.join(str(p) for p in affected_page_numbers[:10])}"
                f"{' and more' if len(affected_page_numbers) > 10 else ''} contained blank or illegible content and were skipped."
            )

    return {
        "isDocumentUsable": is_doc_usable,
        "failureReason": failure_reason,
        "noticeMessage": notice_message,
        "totalPages": total_pages,
        "readablePages": len(readable_pages),
        "unreadablePages": len(unreadable_pages),
        "readablePageNumbers": readable_page_numbers,
        "affectedPageNumbers": affected_page_numbers,
        "totalValidWords": total_valid_words,
        "pages": results
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"isDocumentUsable": False, "failureReason": "No PDF path provided", "pages": []}))
        sys.exit(0)

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        print(json.dumps({"isDocumentUsable": False, "failureReason": f"File not found: {pdf_path}", "pages": []}))
        sys.exit(1)

    result = extract_pdf_document(pdf_path)
    print(json.dumps(result))
