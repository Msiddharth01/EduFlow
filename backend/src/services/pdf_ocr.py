#!/usr/bin/env python3
import sys
import os
import json
import tempfile
import subprocess
import shutil

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

def extract_text_with_ocr(pdf_path):
    tesseract_bin = find_tesseract()
    if not tesseract_bin:
        sys.stderr.write("Tesseract binary not found on system\n")
        return []

    try:
        import pypdf
    except ImportError:
        sys.stderr.write("pypdf module not installed in Python environment\n")
        return []

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as e:
        sys.stderr.write(f"Failed to open PDF with pypdf: {str(e)}\n")
        return []

    results = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        page_text = ""

        # First check if page has any embedded text
        try:
            raw_text = page.extract_text() or ""
            if len(raw_text.strip()) > 30:
                page_text = raw_text.strip()
        except Exception:
            pass

        # If no extractable text, OCR the page images
        if not page_text:
            try:
                images = page.images
                extracted_image_texts = []
                for img in images:
                    ext = os.path.splitext(img.name)[1] if hasattr(img, 'name') and img.name else '.png'
                    if not ext or len(ext) > 5:
                        ext = '.png'
                    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                        tmp.write(img.data)
                        tmp_path = tmp.name

                    try:
                        proc = subprocess.run(
                            [tesseract_bin, tmp_path, 'stdout', '-l', 'eng', '--psm', '3'],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True,
                            timeout=25
                        )
                        ocr_out = proc.stdout.strip()
                        if ocr_out:
                            extracted_image_texts.append(ocr_out)
                    except Exception as ocr_err:
                        sys.stderr.write(f"OCR error on page {page_num}: {str(ocr_err)}\n")
                    finally:
                        if os.path.exists(tmp_path):
                            try:
                                os.remove(tmp_path)
                            except Exception:
                                pass

                if extracted_image_texts:
                    page_text = "\n\n".join(extracted_image_texts).strip()
            except Exception as img_err:
                sys.stderr.write(f"Image extraction error on page {page_num}: {str(img_err)}\n")

        if page_text:
            results.append({"pageNumber": page_num, "text": page_text})

    return results

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        sys.stderr.write(f"File not found: {pdf_path}\n")
        print(json.dumps([]))
        sys.exit(1)

    extracted = extract_text_with_ocr(pdf_path)
    print(json.dumps(extracted))
