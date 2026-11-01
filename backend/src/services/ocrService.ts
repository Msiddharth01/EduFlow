import { execFile, ExecFileException } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  source: 'digital' | 'ocr' | 'failed';
  isReadable: boolean;
  wordCount: number;
  qualityScore: number;
}

export interface DocumentExtractionResult {
  isDocumentUsable: boolean;
  failureReason: string | null;
  noticeMessage?: string | null;
  totalPages: number;
  readablePages: number;
  unreadablePages: number;
  readablePageNumbers?: number[];
  affectedPageNumbers?: number[];
  totalValidWords: number;
  pages: ExtractedPage[];
}

export async function extractDocumentWithQuality(filePath: string): Promise<DocumentExtractionResult> {
  return new Promise((resolve) => {
    const candidates = [
      path.resolve(process.cwd(), 'src/services/pdf_ocr.py'),
      path.resolve(process.cwd(), 'dist/services/pdf_ocr.py'),
      path.resolve(__dirname, 'pdf_ocr.py'),
    ];

    const pythonScript = candidates.find((p) => fs.existsSync(p));

    if (!pythonScript || !fs.existsSync(pythonScript)) {
      console.error(`[OCRService] Python extraction script not found in candidates: ${candidates.join(', ')}`);
      return resolve({
        isDocumentUsable: false,
        failureReason: 'Extraction service script not found.',
        totalPages: 0,
        readablePages: 0,
        unreadablePages: 0,
        totalValidWords: 0,
        pages: [],
      });
    }

    if (!fs.existsSync(filePath)) {
      console.error(`[OCRService] PDF file missing at: ${filePath}`);
      return resolve({
        isDocumentUsable: false,
        failureReason: 'PDF file not found on disk.',
        totalPages: 0,
        readablePages: 0,
        unreadablePages: 0,
        totalValidWords: 0,
        pages: [],
      });
    }

    console.log(`[OCRService] Spawning document extraction for: ${path.basename(filePath)}`);
    execFile(
      'python3',
      [pythonScript, filePath],
      { maxBuffer: 25 * 1024 * 1024, timeout: 180000 },
      (error: ExecFileException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(`[OCRService] Extraction process failed: ${error.message}`);
          if (stderr) console.error(`[OCRService] Stderr: ${stderr.trim()}`);
          return resolve({
            isDocumentUsable: false,
            failureReason: `Extraction process error: ${error.message}`,
            totalPages: 0,
            readablePages: 0,
            unreadablePages: 0,
            totalValidWords: 0,
            pages: [],
          });
        }

        try {
          const result: DocumentExtractionResult = JSON.parse(stdout);
          console.log(
            `[OCRService] Extraction completed for ${path.basename(filePath)}: usable=${result.isDocumentUsable}, ` +
            `pages=${result.readablePages}/${result.totalPages}, words=${result.totalValidWords}`
          );
          return resolve(result);
        } catch (parseErr: any) {
          console.error(`[OCRService] Failed to parse JSON from extraction output: ${parseErr.message}`);
          return resolve({
            isDocumentUsable: false,
            failureReason: 'Invalid JSON output from extraction pipeline.',
            totalPages: 0,
            readablePages: 0,
            unreadablePages: 0,
            totalValidWords: 0,
            pages: [],
          });
        }
      }
    );
  });
}

// Backward compatibility helper
export async function extractTextWithOcr(filePath: string): Promise<Array<{ pageNumber: number; text: string }>> {
  const result = await extractDocumentWithQuality(filePath);
  return result.pages.filter((p) => p.isReadable && p.text.trim().length > 0).map((p) => ({
    pageNumber: p.pageNumber,
    text: p.text,
  }));
}
