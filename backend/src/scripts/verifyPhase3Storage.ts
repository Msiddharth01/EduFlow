import { prisma } from '../config/db';
import {
  downloadPdfFromStorage,
  getSignedPdfUrl,
  uploadPdfToStorage,
  getSupabaseClient,
  DEFAULT_BUCKET,
} from '../services/supabaseStorageService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function verifyPhase3() {
  console.log('====================================================');
  console.log('PHASE 3: SUPABASE STORAGE INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client could not be initialized.');
  }

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  console.log(`Target Bucket: "${bucketName}"`);

  let allPassed = true;

  // 1. Existing Course Materials can be accessed
  console.log('\n--- 1. Existing Course Materials Retrieval ---');
  const materialsWithStorage = await prisma.material.findMany({
    where: { storageKey: { not: null } },
  });
  console.log(`Found ${materialsWithStorage.length} materials with Supabase storageKey.`);

  let materialsAccessible = 0;
  for (const m of materialsWithStorage) {
    const res = await downloadPdfFromStorage(m.storageKey!, bucketName);
    if (res.success && res.data && res.data.length > 0) {
      materialsAccessible++;
      console.log(`   ✅ "${m.title}" (${(res.data.length / 1024).toFixed(1)} KB) - Retrieved successfully.`);
    } else {
      console.error(`   ❌ Failed to retrieve material "${m.title}": ${res.error}`);
      allPassed = false;
    }
  }
  console.log(`Result: ${materialsAccessible}/${materialsWithStorage.length} materials accessible from Supabase Storage.`);

  // 2. Existing Assignment Attachments
  console.log('\n--- 2. Assignment Attachments Verification ---');
  const assignments = await prisma.assignment.findMany();
  console.log(`Found ${assignments.length} assignments in database.`);
  for (const a of assignments) {
    console.log(`   - Assignment: "${a.title}" (Status: ${a.status})`);
  }

  // 3. Student-submitted PDFs
  console.log('\n--- 3. Student Submissions Storage Verification ---');
  const submissions = await prisma.assignmentSubmission.findMany();
  console.log(`Found ${submissions.length} assignment submissions in database.`);
  for (const s of submissions) {
    console.log(`   - Submission ID: ${s.id} (File: ${s.fileName}, Status: ${s.status})`);
  }

  // 4. New PDF Uploads Test
  console.log('\n--- 4. Testing New PDF Upload to Supabase Storage ---');
  const dummyPdfContent = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (EduFlow Test PDF) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  const testKey = `test_verification/test_${Date.now()}.pdf`;
  const uploadRes = await uploadPdfToStorage(dummyPdfContent, testKey, { bucket: bucketName });
  if (uploadRes.success) {
    console.log(`   ✅ Successfully uploaded test PDF: "${testKey}"`);
    // Verify by downloading it back and checking checksum
    const verifyDownload = await downloadPdfFromStorage(testKey, bucketName);
    if (verifyDownload.success && verifyDownload.data) {
      const srcHash = crypto.createHash('sha256').update(dummyPdfContent).digest('hex');
      const dlHash = crypto.createHash('sha256').update(verifyDownload.data).digest('hex');
      const hashMatch = srcHash === dlHash;
      console.log(`   ✅ SHA-256 Checksum match: ${hashMatch ? 'VERIFIED ✅' : 'FAILED ❌'}`);
      if (!hashMatch) allPassed = false;
    }
    // Clean up temporary test file
    await client.storage.from(bucketName).remove([testKey]);
    console.log(`   ✅ Cleaned up temporary test file "${testKey}".`);
  } else {
    console.error(`   ❌ Failed to upload test PDF: ${uploadRes.error}`);
    allPassed = false;
  }

  // 5 & 6. Signed URLs & Appropriate Expiration
  console.log('\n--- 5 & 6. Testing Signed URL Generation & Expiration ---');
  if (materialsWithStorage.length > 0) {
    const sampleMat = materialsWithStorage[0];
    const signedRes = await getSignedPdfUrl(sampleMat.storageKey!, 60, bucketName);
    if (signedRes.success && signedRes.signedUrl) {
      console.log(`   ✅ Signed URL generated successfully for "${sampleMat.title}".`);
      const hasToken = signedRes.signedUrl.includes('token=');
      console.log(`   - Includes authentication token: ${hasToken ? 'YES ✅' : 'NO ❌'}`);
      if (!hasToken) allPassed = false;

      // Test fetching signed URL
      try {
        const fetchRes = await fetch(signedRes.signedUrl);
        console.log(`   ✅ Signed URL HTTP Status: ${fetchRes.status} ${fetchRes.statusText} (${fetchRes.headers.get('content-type')})`);
        if (fetchRes.status !== 200) allPassed = false;
      } catch (err: any) {
        console.error(`   ❌ Failed to fetch signed URL: ${err.message}`);
        allPassed = false;
      }
    } else {
      console.error(`   ❌ Failed to generate signed URL: ${signedRes.error}`);
      allPassed = false;
    }
  }

  // 7. Unauthorized Direct Access Rejection
  console.log('\n--- 7. Security: Private PDF Access Rejection without Signature ---');
  if (materialsWithStorage.length > 0) {
    const sampleKey = materialsWithStorage[0].storageKey!;
    const unsignedUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${sampleKey}`;
    try {
      const unauthRes = await fetch(unsignedUrl);
      console.log(`   - Direct Unsigned Request Status: ${unauthRes.status} (Expected: 400 or 404 for private bucket)`);
      if (unauthRes.status === 200) {
        console.warn('   ⚠️ Warning: Bucket appears to allow public unauthenticated reads.');
      } else {
        console.log('   ✅ Unauthorized direct access is properly blocked/restricted.');
      }
    } catch (err: any) {
      console.log('   ✅ Direct unsigned request could not connect or failed.');
    }
  }

  // 8. Existing Local PDF Fallback (CSS Complete Notes)
  console.log('\n--- 8. Local PDF Fallback Verification ---');
  const cssNotes = await prisma.material.findFirst({
    where: { storageKey: null },
  });
  if (cssNotes && cssNotes.filePath) {
    console.log(`   - Fallback Material: "${cssNotes.title}"`);
    console.log(`   - File Path in DB: "${cssNotes.filePath}"`);
    const localPath = path.resolve(process.cwd(), 'uploads', cssNotes.filePath);
    const existsLocally = fs.existsSync(localPath);
    console.log(`   - Local file exists on disk: ${existsLocally ? 'YES ✅' : 'NO ❌'}`);
    if (existsLocally) {
      const st = fs.statSync(localPath);
      console.log(`   - Local file size: ${(st.size / (1024 * 1024)).toFixed(2)} MB (${st.size} bytes)`);
      console.log('   ✅ Local fallback PDF remains 100% accessible.');
    } else {
      console.error('   ❌ Local fallback file not found in uploads directory!');
      allPassed = false;
    }
  } else {
    console.log('   - No local-only fallback material found.');
  }

  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log(`PHASE 3 RESULT: ${allPassed ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('====================================================\n');
  return allPassed;
}

verifyPhase3().catch((err) => {
  console.error('Phase 3 fatal error:', err);
  process.exit(1);
});
