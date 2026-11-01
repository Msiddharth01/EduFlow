import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// Setup upload directory
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported.'));
    }
  },
});

export const uploadPdfMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum allowed upload size (100 MB).' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Invalid upload request.' });
    }
    next();
  });
};

import { getOllamaEmbedding } from '../services/ollamaService.js';
import { extractDocumentWithQuality, extractTextWithOcr } from '../services/ocrService.js';
import { queueQuizGenerationForMaterial } from '../services/quizGeneratorService.js';
import { notifyEnrolledStudents } from '../services/notificationService.js';
import { NotificationType } from '@prisma/client';

export async function uploadMaterial(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'PDF file is required.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Material title is required.' });
    }

    // Check course existence & ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { enrollments: true },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Check professor permission
    const isProfessor = course.enrollments.some(
      (e: any) => e.userId === req.user!.id && (e.role === 'PROFESSOR' || req.user!.role === 'ADMIN')
    );

    if (!isProfessor && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only course professors can upload materials.' });
    }

    // Create material record
    const material = await prisma.material.create({
      data: {
        courseId,
        uploaderId: req.user!.id,
        title: title.trim(),
        fileName: file.originalname,
        filePath: file.filename,
        fileSize: file.size,
        status: 'PROCESSING',
      },
    });

    console.log(`[MaterialUpload] Uploaded '${file.originalname}' (${file.size} bytes) for course ${courseId} by user ${req.user!.email}.`);

    // Dispatch notification to students enrolled in this specific course
    notifyEnrolledStudents(courseId, {
      title: 'New Lecture Material Uploaded',
      message: `New lecture material "${material.title}" has been uploaded in ${course.title} (${course.code}).`,
      type: NotificationType.MATERIAL_UPLOADED,
      relatedResourceId: material.id,
      linkUrl: `/dashboard/courses/${courseId}`,
    }).catch((notifErr) => {
      console.error('[MaterialUpload] Error sending notifications to enrolled students:', notifErr);
    });

    // Run chunking in background
    processPdfChunks(material.id, file.path).catch((err) => {
      console.error(`[MaterialUpload] Background PDF processing error for material ${material.id}:`, err);
    });

    res.status(201).json({
      message: 'PDF uploaded successfully and is being processed.',
      material,
    });
  } catch (error: any) {
    console.error('[MaterialUpload] Upload material error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload material.' });
  }
}

export async function retryMaterialProcessing(req: AuthenticatedRequest, res: Response) {
  try {
    const materialId = req.params.materialId as string;

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        course: {
          include: { enrollments: true },
        },
      },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Check permission
    const isProfessor = material.course.enrollments.some(
      (e: any) => e.userId === req.user!.id && (e.role === 'PROFESSOR' || req.user!.role === 'ADMIN')
    );

    if (!isProfessor && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only course professors can reprocess materials.' });
    }

    const fullPath = path.resolve(uploadDir, material.filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Underlying document file on disk not found.' });
    }

    // Clear any stale chunks and cached summaries
    await prisma.documentChunk.deleteMany({ where: { materialId } });
    await prisma.materialSummary.deleteMany({ where: { materialId } });

    // Update status to PROCESSING
    const updated = await prisma.material.update({
      where: { id: materialId },
      data: {
        status: 'PROCESSING',
        errorMessage: null,
      },
    });

    console.log(`[MaterialRetry] Reprocessing requested for material '${material.title}' (${material.id}) by user ${req.user!.email}.`);

    // Run chunking in background
    processPdfChunks(material.id, fullPath).catch((err) => {
      console.error(`[MaterialRetry] Error during reprocessing of material ${material.id}:`, err);
    });

    res.json({
      message: 'Reprocessing initiated successfully.',
      material: updated,
    });
  } catch (error: any) {
    console.error('[MaterialRetry] Error retrying material processing:', error);
    res.status(500).json({ error: 'Failed to reprocess material.' });
  }
}

function splitTextIntoSmartChunks(text: string, maxChunkSize = 850): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      if (currentChunk.trim().length >= 35) {
        chunks.push(currentChunk.trim());
      }
      if (para.length > maxChunkSize) {
        const sentences = para.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [para];
        let subChunk = '';
        for (const sent of sentences) {
          if (subChunk.length + sent.length <= maxChunkSize) {
            subChunk = subChunk ? `${subChunk} ${sent.trim()}` : sent.trim();
          } else {
            if (subChunk.trim().length >= 35) chunks.push(subChunk.trim());
            subChunk = sent.trim();
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = para;
      }
    }
  }
  if (currentChunk.trim().length >= 35) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

export async function processPdfChunks(materialId: string, filePath: string) {
  try {
    console.log(`[PDFPipeline] Processing started for material ID: ${materialId}`);

    // Run robust PDF extraction with quality validation & OCR fallback
    const extraction = await extractDocumentWithQuality(filePath);

    if (!extraction.isDocumentUsable || extraction.readablePages === 0) {
      console.warn(`[PDFPipeline] Document ${materialId} failed quality validation: ${extraction.failureReason}`);
      
      // Clear stale chunks and summaries
      await prisma.documentChunk.deleteMany({ where: { materialId } });
      await prisma.materialSummary.deleteMany({ where: { materialId } });

      await prisma.material.update({
        where: { id: materialId },
        data: {
          status: 'FAILED',
          errorMessage:
            extraction.failureReason ||
            'Document contains no readable text. Scanned pages or handwriting could not be deciphered with reliable accuracy.',
        },
      });
      return;
    }

    console.log(
      `[PDFPipeline] Usable document confirmed for ${materialId}: ${extraction.readablePages}/${extraction.totalPages} readable pages, ${extraction.totalValidWords} words.`
    );

    // Clear stale chunks and summaries before inserting newly validated chunks
    await prisma.documentChunk.deleteMany({ where: { materialId } });
    await prisma.materialSummary.deleteMany({ where: { materialId } });

    let totalChunkIndex = 0;
    let embeddingsIndexed = 0;
    let embeddingFailures = 0;

    const readablePages = extraction.pages.filter((p) => p.isReadable && p.text.trim().length > 0);

    for (const page of readablePages) {
      const smartChunks = splitTextIntoSmartChunks(page.text);

      for (const chunkContent of smartChunks) {
        const docChunk = await prisma.documentChunk.create({
          data: {
            materialId,
            chunkIndex: totalChunkIndex,
            pageNumber: page.pageNumber,
            content: chunkContent,
          },
        });

        // Attempt pgvector embedding if Ollama embedding service is active
        try {
          const embedding = await getOllamaEmbedding(chunkContent);
          if (embedding && Array.isArray(embedding) && embedding.length === 768) {
            const vectorString = `[${embedding.join(',')}]`;
            await prisma.$executeRawUnsafe(
              `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
              vectorString,
              docChunk.id
            );
            embeddingsIndexed++;
          } else {
            embeddingFailures++;
          }
        } catch (embedErr: any) {
          embeddingFailures++;
        }

        totalChunkIndex++;
      }
    }

    if (totalChunkIndex > 0) {
      const updatedMaterial = await prisma.material.update({
        where: { id: materialId },
        data: { status: 'READY', errorMessage: extraction.noticeMessage || null },
      });
      console.log(
        `[PDFPipeline] Indexing complete for material ${materialId}: ${totalChunkIndex} chunks created across ${readablePages.length} pages. Embeddings stored: ${embeddingsIndexed}, un-embedded: ${embeddingFailures}. Status set to READY.`
      );

      // Automatically queue quiz generation in the background without blocking upload response
      queueQuizGenerationForMaterial(updatedMaterial.courseId, materialId, 10, false).catch((qErr) => {
        console.error(`[PDFPipeline] Background automatic quiz generation failed for material ${materialId}:`, qErr);
      });
    } else {
      await prisma.material.update({
        where: { id: materialId },
        data: {
          status: 'FAILED',
          errorMessage: 'Could not extract usable text chunks from document.',
        },
      });
      console.error(`[PDFPipeline] Material ${materialId} produced 0 valid chunks. Status set to FAILED.`);
    }
  } catch (err: any) {
    console.error(`[PDFPipeline] Error processing PDF material ${materialId}:`, err);
    await prisma.material.update({
      where: { id: materialId },
      data: { status: 'FAILED', errorMessage: err.message || 'Processing failed.' },
    });
  }
}

export async function serveMaterialFile(req: AuthenticatedRequest, res: Response) {
  try {
    const materialId = req.params.materialId as string;

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        course: {
          include: { enrollments: true },
        },
      },
    });

    if (!material) {
      console.warn(`[MaterialDelivery] Material ${materialId} not found.`);
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Check enrollment
    const isEnrolled = material.course.enrollments.some((e: any) => e.userId === req.user!.id);
    if (!isEnrolled && req.user!.role !== 'ADMIN') {
      console.warn(`[MaterialDelivery] Access denied for user ${req.user!.email} to material ${materialId}.`);
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    const fullPath = path.resolve(uploadDir, material.filePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`[MaterialDelivery] File missing on disk for material ${materialId} at ${fullPath}.`);
      return res.status(404).json({ error: 'File on disk not found.' });
    }

    console.log(`[MaterialDelivery] Streaming PDF '${material.fileName}' (${material.fileSize} bytes) to user ${req.user!.email}.`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${material.fileName}"`);
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error: any) {
    console.error('[MaterialDelivery] Serve material error:', error);
    res.status(500).json({ error: 'Failed to stream PDF file.' });
  }
}
