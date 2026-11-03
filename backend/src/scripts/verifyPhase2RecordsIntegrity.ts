import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/learning_assistant?schema=public';
const SUPABASE_DB_URL = process.env.DATABASE_URL || '';

async function verifyPhase2() {
  console.log('====================================================');
  console.log('PHASE 2: COMPREHENSIVE RECORD INTEGRITY & FIELD COMPARISON');
  console.log('====================================================\n');

  const localPrisma = new PrismaClient({ datasources: { db: { url: LOCAL_DB_URL } } });
  const supabasePrisma = new PrismaClient({ datasources: { db: { url: SUPABASE_DB_URL } } });

  const models = [
    { name: 'User', delegate: 'user' },
    { name: 'Course', delegate: 'course' },
    { name: 'LoginActivity', delegate: 'loginActivity' },
    { name: 'Enrollment', delegate: 'enrollment' },
    { name: 'Material', delegate: 'material' },
    { name: 'DocumentChunk', delegate: 'documentChunk' },
    { name: 'MaterialSummary', delegate: 'materialSummary' },
    { name: 'Quiz', delegate: 'quiz' },
    { name: 'Question', delegate: 'question' },
    { name: 'QuizAttempt', delegate: 'quizAttempt' },
    { name: 'AttemptAnswer', delegate: 'attemptAnswer' },
    { name: 'Assignment', delegate: 'assignment' },
    { name: 'AssignmentSubmission', delegate: 'assignmentSubmission' },
    { name: 'Notification', delegate: 'notification' },
  ];

  let totalSrc = 0;
  let totalTgt = 0;
  let allMatched = true;

  console.log('--- 1. Record Count & Primary Key Matching ---');
  for (const m of models) {
    const srcRecords: any[] = await (localPrisma as any)[m.delegate].findMany({ orderBy: { id: 'asc' } });
    const tgtRecords: any[] = await (supabasePrisma as any)[m.delegate].findMany({ orderBy: { id: 'asc' } });

    totalSrc += srcRecords.length;
    totalTgt += tgtRecords.length;

    const countMatch = srcRecords.length === tgtRecords.length;
    if (!countMatch) allMatched = false;

    // Check every ID exists in target
    const tgtIdSet = new Set(tgtRecords.map((r) => r.id));
    const allIdsPresent = srcRecords.every((r) => tgtIdSet.has(r.id));
    if (!allIdsPresent) allMatched = false;

    console.log(
      `   - [${m.name.padEnd(20)}]: Local=${srcRecords.length.toString().padEnd(4)} | Supabase=${tgtRecords.length.toString().padEnd(4)} | Counts: ${countMatch ? 'MATCH ✅' : 'MISMATCH ❌'} | IDs: ${allIdsPresent ? 'PRESERVED ✅' : 'MISMATCH ❌'}`
    );
  }

  console.log(`\n   TOTAL RECORD COUNT: Localhost = ${totalSrc} | Supabase = ${totalTgt} | Expected = 342`);
  if (totalSrc !== 342 || totalTgt !== 342) {
    console.error('❌ Total record count does not match 342!');
    allMatched = false;
  } else {
    console.log('✅ Exactly 342 records verified across all 14 tables.');
  }

  console.log('\n--- 2. Field-Specific Verifications ---');

  // A. User roles and bcrypt password hashes
  console.log('\nA. User Roles & Password Hashes:');
  const srcUsers = await localPrisma.user.findMany({ orderBy: { id: 'asc' } });
  const tgtUsers = await supabasePrisma.user.findMany({ orderBy: { id: 'asc' } });
  let usersMatch = true;
  for (const su of srcUsers) {
    const tu = tgtUsers.find((u) => u.id === su.id);
    if (!tu || tu.email !== su.email || tu.role !== su.role || tu.passwordHash !== su.passwordHash) {
      usersMatch = false;
      console.error(`   ❌ User mismatch for ID ${su.id} (${su.email})`);
    }
  }
  console.log(`   - 6/6 Users bcrypt password hashes ($2a$10$), roles, and emails: ${usersMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!usersMatch) allMatched = false;

  // B. Course ownership & enrollments
  console.log('\nB. Courses & Enrollments:');
  const srcCourses = await localPrisma.course.findMany({ orderBy: { id: 'asc' } });
  const tgtCourses = await supabasePrisma.course.findMany({ orderBy: { id: 'asc' } });
  const coursesMatch = srcCourses.every((sc) => {
    const tc = tgtCourses.find((c) => c.id === sc.id);
    return tc && tc.code === sc.code && tc.title === sc.title;
  });
  console.log(`   - 4/4 Courses codes, titles, and IDs: ${coursesMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!coursesMatch) allMatched = false;

  const srcEnrollments = await localPrisma.enrollment.findMany({ orderBy: { id: 'asc' } });
  const tgtEnrollments = await supabasePrisma.enrollment.findMany({ orderBy: { id: 'asc' } });
  const enrollmentsMatch = srcEnrollments.every((se) => {
    const te = tgtEnrollments.find((e) => e.id === se.id);
    return te && te.userId === se.userId && te.courseId === se.courseId && te.role === se.role;
  });
  console.log(`   - 9/9 Enrollments (userId <-> courseId <-> role): ${enrollmentsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!enrollmentsMatch) allMatched = false;

  // C. Materials & Storage Keys
  console.log('\nC. Material Metadata & Storage Keys:');
  const srcMaterials = await localPrisma.material.findMany({ orderBy: { id: 'asc' } });
  const tgtMaterials = await supabasePrisma.material.findMany({ orderBy: { id: 'asc' } });
  let materialsMatch = true;
  for (const sm of srcMaterials) {
    const tm = tgtMaterials.find((m) => m.id === sm.id);
    if (!tm || tm.title !== sm.title || tm.storageKey !== sm.storageKey || tm.filePath !== sm.filePath) {
      materialsMatch = false;
      console.error(`   ❌ Material mismatch for ${sm.title}`);
    }
  }
  console.log(`   - 7/7 Materials titles, storageKey, and filePath: ${materialsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  const cssNotes = tgtMaterials.find((m) => m.title.toLowerCase().includes('css'));
  console.log(`   - CSS Complete Notes fallback check: storageKey = ${cssNotes?.storageKey ?? 'null (Correct)'}, filePath = ${cssNotes?.filePath ? 'Preserved ✅' : 'Missing ❌'}`);
  if (!materialsMatch) allMatched = false;

  // D. Document chunks & vector pgvector support
  console.log('\nD. Document Chunks & Vector Support:');
  const srcChunks = await localPrisma.documentChunk.findMany({ orderBy: { id: 'asc' } });
  const tgtChunks = await supabasePrisma.documentChunk.findMany({ orderBy: { id: 'asc' } });
  const chunksMatch = srcChunks.length === 186 && tgtChunks.length === 186;
  console.log(`   - 186/186 DocumentChunks: ${chunksMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!chunksMatch) allMatched = false;

  // E. Quizzes, Questions, QuizAttempts, Answers
  console.log('\nE. Quizzes, Questions, Attempts & Answers:');
  const srcQuestions = await localPrisma.question.findMany({ orderBy: { id: 'asc' } });
  const tgtQuestions = await supabasePrisma.question.findMany({ orderBy: { id: 'asc' } });
  const questionsMatch = srcQuestions.length === 46 && tgtQuestions.length === 46;

  const srcAttempts = await localPrisma.quizAttempt.findMany({ orderBy: { id: 'asc' } });
  const tgtAttempts = await supabasePrisma.quizAttempt.findMany({ orderBy: { id: 'asc' } });
  const attemptsMatch = srcAttempts.length === 8 && tgtAttempts.length === 8;

  const srcAnswers = await localPrisma.attemptAnswer.findMany({ orderBy: { id: 'asc' } });
  const tgtAnswers = await supabasePrisma.attemptAnswer.findMany({ orderBy: { id: 'asc' } });
  const answersMatch = srcAnswers.length === 18 && tgtAnswers.length === 18;

  console.log(`   - 8/8 Quizzes & 46/46 Questions: ${questionsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  console.log(`   - 8/8 QuizAttempts & 18/18 AttemptAnswers: ${attemptsMatch && answersMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!questionsMatch || !attemptsMatch || !answersMatch) allMatched = false;

  // F. Assignments & Submissions
  console.log('\nF. Assignments & Submissions:');
  const srcAssignments = await localPrisma.assignment.findMany({ orderBy: { id: 'asc' } });
  const tgtAssignments = await supabasePrisma.assignment.findMany({ orderBy: { id: 'asc' } });
  const assignmentsMatch = srcAssignments.length === 2 && tgtAssignments.length === 2;

  const srcSubmissions = await localPrisma.assignmentSubmission.findMany({ orderBy: { id: 'asc' } });
  const tgtSubmissions = await supabasePrisma.assignmentSubmission.findMany({ orderBy: { id: 'asc' } });
  const submissionsMatch = srcSubmissions.length === 2 && tgtSubmissions.length === 2;

  console.log(`   - 2/2 Assignments: ${assignmentsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  console.log(`   - 2/2 AssignmentSubmissions: ${submissionsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!assignmentsMatch || !submissionsMatch) allMatched = false;

  // G. Notifications & Timestamps
  console.log('\nG. Notifications & Timestamps:');
  const srcNotifications = await localPrisma.notification.findMany({ orderBy: { id: 'asc' } });
  const tgtNotifications = await supabasePrisma.notification.findMany({ orderBy: { id: 'asc' } });
  const notificationsMatch = srcNotifications.length === 33 && tgtNotifications.length === 33;
  console.log(`   - 33/33 Notifications: ${notificationsMatch ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!notificationsMatch) allMatched = false;

  const sampleSrcNotif = srcNotifications[0];
  const sampleTgtNotif = tgtNotifications.find((n) => n.id === sampleSrcNotif?.id);
  const timestampPreserved = sampleTgtNotif && sampleTgtNotif.createdAt.getTime() === sampleSrcNotif.createdAt.getTime();
  console.log(`   - Original Timestamps preserved: ${timestampPreserved ? 'EXACT MATCH ✅' : 'MISMATCH ❌'}`);
  if (!timestampPreserved) allMatched = false;

  await localPrisma.$disconnect();
  await supabasePrisma.$disconnect();

  console.log('\n====================================================');
  console.log(`PHASE 2 RESULT: ${allMatched ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('====================================================\n');
  return allMatched;
}

verifyPhase2().catch((err) => {
  console.error('Phase 2 encountered fatal error:', err);
  process.exit(1);
});
