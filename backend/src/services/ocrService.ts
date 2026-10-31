import { execFile, ExecFileException } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export async function extractTextWithOcr(filePath: string): Promise<ExtractedPage[]> {
  return new Promise((resolve) => {
    const candidates = [
      path.resolve(process.cwd(), 'src/services/pdf_ocr.py'),
      path.resolve(process.cwd(), 'dist/services/pdf_ocr.py'),
      path.resolve(__dirname, 'pdf_ocr.py'),
    ];

    const pythonScript = candidates.find((p) => fs.existsSync(p));

    if (!pythonScript || !fs.existsSync(pythonScript)) {
      console.error(`[OCRService] Python OCR script not found in candidates: ${candidates.join(', ')}`);
      return resolve([]);
    }

    if (!fs.existsSync(filePath)) {
      console.error(`[OCRService] PDF file missing at: ${filePath}`);
      return resolve([]);
    }

    console.log(`[OCRService] Spawning OCR subprocess for: ${path.basename(filePath)}`);
    execFile(
      'python3',
      [pythonScript, filePath],
      { maxBuffer: 15 * 1024 * 1024, timeout: 120000 },
      (error: ExecFileException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(`[OCRService] OCR process failed: ${error.message}`);
          if (stderr) console.error(`[OCRService] Stderr: ${stderr.trim()}`);
          return resolve([]);
        }

        try {
          const pages: ExtractedPage[] = JSON.parse(stdout);
          const totalChars = pages.reduce((sum, p) => sum + (p.text ? p.text.length : 0), 0);
          console.log(`[OCRService] OCR completed: ${pages.length} pages extracted (${totalChars} characters).`);
          return resolve(pages);
        } catch (parseErr: any) {
          console.error(`[OCRService] Failed to parse JSON from OCR output: ${parseErr.message}`);
          return resolve([]);
        }
      }
    );
  });
}
