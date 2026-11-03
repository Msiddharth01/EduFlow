import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Response } from 'express';

// Environment configurations
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'eduflow-pdfs';
const BASE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client using service role key, or null if unconfigured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Check if Supabase Storage is configured with URL and Service Role Key
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Sanitize filename to be safe in URL / S3-like object storage keys
 */
export function sanitizeStorageFileName(originalName: string): string {
  const ext = path.extname(originalName) || '.pdf';
  const nameWithoutExt = path.basename(originalName, ext);
  const safeName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 50);
  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * Generate standardized, collision-free storage keys
 */
export function generateMaterialKey(courseId: string, originalName: string): string {
  const safe = sanitizeStorageFileName(originalName);
  const uid = crypto.randomUUID().slice(0, 8);
  return `materials/${courseId}/${Date.now()}_${uid}_${safe}`;
}

export function generateAssignmentAttachmentKey(assignmentId: string, originalName: string): string {
  const safe = sanitizeStorageFileName(originalName);
  const uid = crypto.randomUUID().slice(0, 8);
  return `assignments/${assignmentId}/attachment_${Date.now()}_${uid}_${safe}`;
}

export function generateSubmissionKey(assignmentId: string, studentId: string, originalName: string): string {
  const safe = sanitizeStorageFileName(originalName);
  const uid = crypto.randomUUID().slice(0, 8);
  return `submissions/${assignmentId}/${studentId}_${Date.now()}_${uid}_${safe}`;
}

/**
 * Upload a PDF buffer to Supabase Storage
 */
export async function uploadPdfToStorage(
  buffer: Buffer,
  storageKey: string,
  options?: {
    bucket?: string;
    contentType?: string;
    upsert?: boolean;
    metadata?: Record<string, string>;
  }
): Promise<{ success: boolean; storageKey: string; bucket: string; error?: string }> {
  const bucket = options?.bucket || DEFAULT_BUCKET;
  const contentType = options?.contentType || 'application/pdf';
  const upsert = options?.upsert ?? true;

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      storageKey,
      bucket,
      error: 'Supabase Storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).',
    };
  }

  try {
    const { error } = await client.storage.from(bucket).upload(storageKey, buffer, {
      contentType,
      upsert,
      ...(options?.metadata ? { metadata: options.metadata } : {}),
    });

    if (error) {
      console.error(`[SupabaseStorage] Upload error for key '${storageKey}':`, error.message);
      return { success: false, storageKey, bucket, error: error.message };
    }

    console.log(`[SupabaseStorage] Successfully uploaded '${storageKey}' to bucket '${bucket}' (${buffer.length} bytes).`);
    return { success: true, storageKey, bucket };
  } catch (err: any) {
    console.error(`[SupabaseStorage] Upload exception for key '${storageKey}':`, err);
    return { success: false, storageKey, bucket, error: err.message || 'Unknown upload exception' };
  }
}

/**
 * Download a PDF from Supabase Storage into a Buffer
 */
export async function downloadPdfFromStorage(
  storageKey: string,
  bucket = DEFAULT_BUCKET
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase Storage is not configured.' };
  }

  try {
    const { data, error } = await client.storage.from(bucket).download(storageKey);
    if (error || !data) {
      return { success: false, error: error ? error.message : 'No data returned from storage.' };
    }

    const arrayBuffer = await data.arrayBuffer();
    return { success: true, data: Buffer.from(arrayBuffer) };
  } catch (err: any) {
    console.error(`[SupabaseStorage] Download exception for '${storageKey}':`, err);
    return { success: false, error: err.message || 'Failed to download file from storage.' };
  }
}

/**
 * Generate a short-lived signed URL for direct authenticated viewing / preview
 */
export async function getSignedPdfUrl(
  storageKey: string,
  expiresInSeconds = 120,
  bucket = DEFAULT_BUCKET
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase Storage is not configured.' };
  }

  try {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: error ? error.message : 'Signed URL generation failed.' };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: any) {
    console.error(`[SupabaseStorage] Signed URL error for '${storageKey}':`, err);
    return { success: false, error: err.message || 'Failed to generate signed URL.' };
  }
}

/**
 * Check if a file exists in the Supabase bucket
 */
export async function checkStorageFileExists(
  storageKey: string,
  bucket = DEFAULT_BUCKET
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const dir = path.dirname(storageKey);
    const fileName = path.basename(storageKey);
    const folder = dir === '.' ? '' : dir;

    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit: 100,
      search: fileName,
    });

    if (error || !data) return false;
    return data.some((item) => item.name === fileName);
  } catch (err) {
    return false;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deletePdfFromStorage(
  storageKey: string,
  bucket = DEFAULT_BUCKET
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase Storage is not configured.' };
  }

  try {
    const { error } = await client.storage.from(bucket).remove([storageKey]);
    if (error) {
      console.warn(`[SupabaseStorage] Could not delete key '${storageKey}':`, error.message);
      return { success: false, error: error.message };
    }
    console.log(`[SupabaseStorage] Successfully deleted '${storageKey}' from bucket '${bucket}'.`);
    return { success: true };
  } catch (err: any) {
    console.warn(`[SupabaseStorage] Delete exception for '${storageKey}':`, err);
    return { success: false, error: err.message || 'Failed to delete file from storage.' };
  }
}

/**
 * Stream a PDF securely to the Express Response object.
 * Attempts Supabase Storage download first; falls back to local disk if unconfigured or missing.
 */
export async function streamPdfToResponse(params: {
  res: Response;
  storageKey?: string | null;
  storageBucket?: string | null;
  fallbackLocalPath?: string | null;
  downloadFileName?: string | null;
}): Promise<boolean> {
  const { res, storageKey, storageBucket, fallbackLocalPath, downloadFileName } = params;
  const safeFilename = downloadFileName || 'document.pdf';
  const bucket = storageBucket || DEFAULT_BUCKET;

  // 1. Try Supabase Storage if storageKey is present and Supabase is configured
  if (storageKey && isSupabaseConfigured()) {
    const downloadRes = await downloadPdfFromStorage(storageKey, bucket);
    if (downloadRes.success && downloadRes.data) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('Content-Length', downloadRes.data.length);
      res.send(downloadRes.data);
      return true;
    }
    console.warn(`[SupabaseStorage] Could not download '${storageKey}' from Supabase, attempting local fallback.`);
  }

  // 2. Fallback to local disk if available
  if (fallbackLocalPath) {
    const fullLocalPath = path.isAbsolute(fallbackLocalPath)
      ? fallbackLocalPath
      : path.resolve(BASE_UPLOAD_DIR, fallbackLocalPath);

    if (fs.existsSync(fullLocalPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      const stream = fs.createReadStream(fullLocalPath);
      stream.pipe(res);
      return true;
    }
  }

  // 3. File not found in either storage system
  res.status(404).json({ error: 'Requested PDF document could not be located on storage or disk.' });
  return false;
}
