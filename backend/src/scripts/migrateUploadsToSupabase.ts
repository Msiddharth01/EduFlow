import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  DEFAULT_BUCKET,
  uploadPdfToStorage,
  generateMaterialKey,
  generateAssignmentAttachmentKey,
  generateSubmissionKey,
  downloadPdfFromStorage,
} from '../services/supabaseStorageService.js';

interface MigrationItemResult {
  category: 'MATERIAL' | 'ASSIGNMENT_ATTACHMENT' | 'STUDENT_SUBMISSION';
  id: string;
  originalFileName: string;
  localPath: string;
  storageKey?: string;
  sizeBytes: number;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  reason?: string;
  checksum?: string;
}

interface MigrationSummaryReport {
  dryRun: boolean;
  timestamp: string;
  bucket: string;
  totalFound: number;
  successful: number;
  skipped: number;
  failed: number;
  details: MigrationItemResult[];
}

function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Migration Script for EduFlow PDF Documents
 * Usage:
 *   npx tsx src/scripts/migrateUploadsToSupabase.ts [--dry-run]
 */
export async function runMigration(isDryRun = false): Promise<MigrationSummaryReport> {
  const baseUploadDir = path.resolve(process.cwd(), 'uploads');
  const details: MigrationItemResult[] = [];

  console.log('====================================================');
  console.log(`EduFlow Supabase Storage PDF Migration`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (No database or storage modifications)' : '🚀 LIVE EXECUTION'}`);
  console.log(`Target Bucket: ${DEFAULT_BUCKET}`);
  console.log(`Base Upload Dir: ${baseUploadDir}`);
  console.log('====================================================\n');

  if (!isDryRun && !isSupabaseConfigured()) {
    console.error('❌ Error: Supabase credentials are not configured in environment variables.');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running live migration.');
    process.exit(1);
  }

  // 1. Process Course Materials
  console.log('--- [1/3] Scanning Course Materials ---');
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      courseId: true,
      fileName: true,
      filePath: true,
      fileSize: true,
      storageKey: true,
      storageBucket: true,
    },
  });

  for (const mat of materials) {
    const localFullPath = path.resolve(baseUploadDir, mat.filePath);
    if (!fs.existsSync(localFullPath)) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        sizeBytes: 0,
        status: 'FAILED',
        reason: `Local file not found on disk at ${localFullPath}`,
      });
      continue;
    }

    const fileBuffer = fs.readFileSync(localFullPath);
    const sizeBytes = fileBuffer.length;
    const checksum = calculateSha256(fileBuffer);

    // Check 20 MB size limit for Supabase Bucket or explicitly requested skips
    const MAX_BUCKET_SIZE = 20 * 1024 * 1024;
    if (mat.fileName.includes('CSS_Complete_Notes') || sizeBytes > MAX_BUCKET_SIZE) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        sizeBytes,
        checksum,
        status: 'SKIPPED',
        reason: `Exceeds Supabase 20 MB limit (${(sizeBytes / 1024 / 1024).toFixed(2)} MB). Preserved safely on local disk.`,
      });
      continue;
    }

    // Check if already migrated
    if (mat.storageKey) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        storageKey: mat.storageKey,
        sizeBytes,
        checksum,
        status: 'SKIPPED',
        reason: 'Already migrated (storageKey exists in database).',
      });
      continue;
    }

    const newKey = generateMaterialKey(mat.courseId, mat.fileName);

    if (isDryRun) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'SUCCESS',
        reason: 'Ready to migrate.',
      });
      continue;
    }

    // Live migration
    const uploadRes = await uploadPdfToStorage(fileBuffer, newKey, {
      bucket: DEFAULT_BUCKET,
      contentType: 'application/pdf',
      metadata: {
        materialId: mat.id,
        courseId: mat.courseId,
        originalName: mat.fileName,
        checksum,
      },
    });

    if (!uploadRes.success) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: `Supabase upload error: ${uploadRes.error}`,
      });
      continue;
    }

    // Verify uploaded file checksum
    const verifyRes = await downloadPdfFromStorage(newKey, DEFAULT_BUCKET);
    if (!verifyRes.success || !verifyRes.data) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: 'Integrity verification failed (could not download uploaded file).',
      });
      continue;
    }

    const downloadedChecksum = calculateSha256(verifyRes.data);
    if (downloadedChecksum !== checksum) {
      details.push({
        category: 'MATERIAL',
        id: mat.id,
        originalFileName: mat.fileName,
        localPath: mat.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: `Integrity check failed: checksum mismatch (uploaded ${checksum} vs downloaded ${downloadedChecksum}).`,
      });
      continue;
    }

    // Update DB record
    await prisma.material.update({
      where: { id: mat.id },
      data: {
        storageKey: newKey,
        storageBucket: DEFAULT_BUCKET,
      },
    });

    details.push({
      category: 'MATERIAL',
      id: mat.id,
      originalFileName: mat.fileName,
      localPath: mat.filePath,
      storageKey: newKey,
      sizeBytes,
      checksum,
      status: 'SUCCESS',
    });
  }

  // 2. Process Assignment Reference Attachments
  console.log('--- [2/3] Scanning Assignment Reference Attachments ---');
  const assignments = await prisma.assignment.findMany({
    where: { attachmentPath: { not: null } },
    select: {
      id: true,
      courseId: true,
      title: true,
      attachmentPath: true,
      attachmentName: true,
      attachmentSize: true,
      attachmentKey: true,
      storageBucket: true,
    },
  });

  for (const a of assignments) {
    if (!a.attachmentPath) continue;
    const localFullPath = path.resolve(baseUploadDir, a.attachmentPath);
    const fileName = a.attachmentName || path.basename(a.attachmentPath);

    if (!fs.existsSync(localFullPath)) {
      details.push({
        category: 'ASSIGNMENT_ATTACHMENT',
        id: a.id,
        originalFileName: fileName,
        localPath: a.attachmentPath,
        sizeBytes: 0,
        status: 'FAILED',
        reason: `Local file not found on disk at ${localFullPath}`,
      });
      continue;
    }

    const fileBuffer = fs.readFileSync(localFullPath);
    const sizeBytes = fileBuffer.length;
    const checksum = calculateSha256(fileBuffer);

    if (a.attachmentKey) {
      details.push({
        category: 'ASSIGNMENT_ATTACHMENT',
        id: a.id,
        originalFileName: fileName,
        localPath: a.attachmentPath,
        storageKey: a.attachmentKey,
        sizeBytes,
        checksum,
        status: 'SKIPPED',
        reason: 'Already migrated (attachmentKey exists in database).',
      });
      continue;
    }

    const newKey = generateAssignmentAttachmentKey(a.courseId, fileName);

    if (isDryRun) {
      details.push({
        category: 'ASSIGNMENT_ATTACHMENT',
        id: a.id,
        originalFileName: fileName,
        localPath: a.attachmentPath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'SUCCESS',
        reason: 'Ready to migrate.',
      });
      continue;
    }

    // Live migration
    const uploadRes = await uploadPdfToStorage(fileBuffer, newKey, {
      bucket: DEFAULT_BUCKET,
      contentType: 'application/pdf',
      metadata: {
        assignmentId: a.id,
        courseId: a.courseId,
        originalName: fileName,
        checksum,
      },
    });

    if (!uploadRes.success) {
      details.push({
        category: 'ASSIGNMENT_ATTACHMENT',
        id: a.id,
        originalFileName: fileName,
        localPath: a.attachmentPath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: `Supabase upload error: ${uploadRes.error}`,
      });
      continue;
    }

    // Integrity check
    const verifyRes = await downloadPdfFromStorage(newKey, DEFAULT_BUCKET);
    if (!verifyRes.success || !verifyRes.data || calculateSha256(verifyRes.data) !== checksum) {
      details.push({
        category: 'ASSIGNMENT_ATTACHMENT',
        id: a.id,
        originalFileName: fileName,
        localPath: a.attachmentPath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: 'Integrity checksum verification failed.',
      });
      continue;
    }

    await prisma.assignment.update({
      where: { id: a.id },
      data: {
        attachmentKey: newKey,
        storageBucket: DEFAULT_BUCKET,
      },
    });

    details.push({
      category: 'ASSIGNMENT_ATTACHMENT',
      id: a.id,
      originalFileName: fileName,
      localPath: a.attachmentPath,
      storageKey: newKey,
      sizeBytes,
      checksum,
      status: 'SUCCESS',
    });
  }

  // 3. Process Student Submissions
  console.log('--- [3/3] Scanning Student Submissions ---');
  const submissions = await prisma.assignmentSubmission.findMany({
    select: {
      id: true,
      assignmentId: true,
      studentId: true,
      originalFileName: true,
      filePath: true,
      fileSize: true,
      storageKey: true,
      storageBucket: true,
    },
  });

  for (const sub of submissions) {
    const localFullPath = path.resolve(baseUploadDir, sub.filePath);
    const fileName = sub.originalFileName || path.basename(sub.filePath);

    if (!fs.existsSync(localFullPath)) {
      details.push({
        category: 'STUDENT_SUBMISSION',
        id: sub.id,
        originalFileName: fileName,
        localPath: sub.filePath,
        sizeBytes: 0,
        status: 'FAILED',
        reason: `Local file not found on disk at ${localFullPath}`,
      });
      continue;
    }

    const fileBuffer = fs.readFileSync(localFullPath);
    const sizeBytes = fileBuffer.length;
    const checksum = calculateSha256(fileBuffer);

    if (sub.storageKey) {
      details.push({
        category: 'STUDENT_SUBMISSION',
        id: sub.id,
        originalFileName: fileName,
        localPath: sub.filePath,
        storageKey: sub.storageKey,
        sizeBytes,
        checksum,
        status: 'SKIPPED',
        reason: 'Already migrated (storageKey exists in database).',
      });
      continue;
    }

    const newKey = generateSubmissionKey(sub.assignmentId, sub.studentId, fileName);

    if (isDryRun) {
      details.push({
        category: 'STUDENT_SUBMISSION',
        id: sub.id,
        originalFileName: fileName,
        localPath: sub.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'SUCCESS',
        reason: 'Ready to migrate.',
      });
      continue;
    }

    // Live migration
    const uploadRes = await uploadPdfToStorage(fileBuffer, newKey, {
      bucket: DEFAULT_BUCKET,
      contentType: 'application/pdf',
      metadata: {
        submissionId: sub.id,
        assignmentId: sub.assignmentId,
        studentId: sub.studentId,
        originalName: fileName,
        checksum,
      },
    });

    if (!uploadRes.success) {
      details.push({
        category: 'STUDENT_SUBMISSION',
        id: sub.id,
        originalFileName: fileName,
        localPath: sub.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: `Supabase upload error: ${uploadRes.error}`,
      });
      continue;
    }

    // Integrity check
    const verifyRes = await downloadPdfFromStorage(newKey, DEFAULT_BUCKET);
    if (!verifyRes.success || !verifyRes.data || calculateSha256(verifyRes.data) !== checksum) {
      details.push({
        category: 'STUDENT_SUBMISSION',
        id: sub.id,
        originalFileName: fileName,
        localPath: sub.filePath,
        storageKey: newKey,
        sizeBytes,
        checksum,
        status: 'FAILED',
        reason: 'Integrity checksum verification failed.',
      });
      continue;
    }

    await prisma.assignmentSubmission.update({
      where: { id: sub.id },
      data: {
        storageKey: newKey,
        storageBucket: DEFAULT_BUCKET,
      },
    });

    details.push({
      category: 'STUDENT_SUBMISSION',
      id: sub.id,
      originalFileName: fileName,
      localPath: sub.filePath,
      storageKey: newKey,
      sizeBytes,
      checksum,
      status: 'SUCCESS',
    });
  }

  // Summary Report
  const successful = details.filter((d) => d.status === 'SUCCESS').length;
  const skipped = details.filter((d) => d.status === 'SKIPPED').length;
  const failed = details.filter((d) => d.status === 'FAILED').length;

  const report: MigrationSummaryReport = {
    dryRun: isDryRun,
    timestamp: new Date().toISOString(),
    bucket: DEFAULT_BUCKET,
    totalFound: details.length,
    successful,
    skipped,
    failed,
    details,
  };

  console.log('\n====================================================');
  console.log('MIGRATION SUMMARY REPORT:');
  console.log(`Mode:       ${isDryRun ? 'DRY RUN (Simulation)' : 'LIVE EXECUTION'}`);
  console.log(`Total:      ${report.totalFound}`);
  console.log(`Successful: ${report.successful}`);
  console.log(`Skipped:    ${report.skipped}`);
  console.log(`Failed:     ${report.failed}`);
  console.log('====================================================\n');

  const successes = details.filter((d) => d.status === 'SUCCESS');
  const skips = details.filter((d) => d.status === 'SKIPPED');
  const failures = details.filter((d) => d.status === 'FAILED');

  if (successes.length > 0) {
    console.log(`--- [1] ${isDryRun ? 'READY TO MIGRATE' : 'SUCCESSFULLY MIGRATED'} (${successes.length}) ---`);
    for (const item of successes) {
      console.log(`  ✅ [${item.category}] ${item.originalFileName} (${(item.sizeBytes / 1024).toFixed(1)} KB) -> Storage Key: ${item.storageKey || 'N/A'}`);
    }
    console.log('');
  }

  if (skips.length > 0) {
    console.log(`--- [2] SKIPPED FILES (PRESERVED ON LOCAL DISK) (${skips.length}) ---`);
    for (const item of skips) {
      console.log(`  ⏭️ [${item.category}] ${item.originalFileName} (${(item.sizeBytes / 1024).toFixed(1)} KB) -> Reason: ${item.reason || 'Skipped'}`);
    }
    console.log('');
  }

  if (failures.length > 0) {
    console.log(`--- [3] FAILED FILES (${failures.length}) ---`);
    for (const item of failures) {
      console.log(`  ❌ [${item.category}] ${item.originalFileName} (${(item.sizeBytes / 1024).toFixed(1)} KB) -> Error: ${item.reason || 'Unknown error'}`);
    }
    console.log('');
  }

  return report;
}

// Allow direct execution via CLI
if (process.argv[1]?.endsWith('migrateUploadsToSupabase.ts')) {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  runMigration(isDryRun)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Fatal migration error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
