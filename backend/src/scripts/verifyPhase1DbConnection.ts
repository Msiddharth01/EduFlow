import { prisma } from '../config/db';
import dotenv from 'dotenv';
dotenv.config();

function maskUrl(url: string | undefined): string {
  if (!url) return 'NOT_SET';
  try {
    const parsed = new URL(url.replace('postgresql://', 'http://'));
    return `postgresql://${parsed.username ? parsed.username.split('.')[0] + '.[REDACTED]' : '[REDACTED]'}@${parsed.host}${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return '[REDACTED_URI]';
  }
}

async function verifyPhase1() {
  console.log('====================================================');
  console.log('PHASE 1: DATABASE CONNECTION & CONFIGURATION VERIFICATION');
  console.log('====================================================\n');

  const dbUrl = process.env.DATABASE_URL;
  console.log('1. Database Configuration:');
  console.log(`   - DATABASE_URL configured: ${dbUrl ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   - Masked URI: ${maskUrl(dbUrl)}`);

  // Verify it points to Supabase and not localhost
  const isSupabase = dbUrl?.includes('pooler.supabase.com') || dbUrl?.includes('.supabase.co');
  const isLocalhost = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');

  console.log(`   - Points to Supabase: ${isSupabase ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   - Points to Localhost: ${isLocalhost ? 'YES (ERROR) ❌' : 'NO (CORRECT) ✅'}`);
  console.log(`   - Uses Transaction Pooler (port 6543 / pgbouncer=true): ${dbUrl?.includes(':6543') && dbUrl?.includes('pgbouncer=true') ? 'YES ✅' : 'NO ❌'}`);

  if (!isSupabase || isLocalhost) {
    throw new Error('DATABASE_URL is not properly set to Supabase Transaction Pooler!');
  }

  // Connect using Prisma Client
  console.log('\n2. Testing Backend Prisma Client Connectivity:');
  try {
    const versionRes: any = await prisma.$queryRawUnsafe('SELECT version()');
    console.log(`   - Connected Engine: ${versionRes[0].version.split('\n')[0]}`);
    console.log('   - Connection: ACTIVE & FUNCTIONAL ✅');
  } catch (err: any) {
    console.error('   - Connection Failed ❌:', err.message);
    throw err;
  }

  // Verify all 14 tables can be queried
  console.log('\n3. Querying All 14 EduFlow Tables through Prisma Delegates:');
  const tables = [
    { name: 'User', delegate: prisma.user },
    { name: 'Course', delegate: prisma.course },
    { name: 'LoginActivity', delegate: prisma.loginActivity },
    { name: 'Enrollment', delegate: prisma.enrollment },
    { name: 'Material', delegate: prisma.material },
    { name: 'DocumentChunk', delegate: prisma.documentChunk },
    { name: 'MaterialSummary', delegate: prisma.materialSummary },
    { name: 'Quiz', delegate: prisma.quiz },
    { name: 'Question', delegate: prisma.question },
    { name: 'QuizAttempt', delegate: prisma.quizAttempt },
    { name: 'AttemptAnswer', delegate: prisma.attemptAnswer },
    { name: 'Assignment', delegate: prisma.assignment },
    { name: 'AssignmentSubmission', delegate: prisma.assignmentSubmission },
    { name: 'Notification', delegate: prisma.notification },
  ];

  let allQueried = true;
  for (const t of tables) {
    try {
      const count = await t.delegate.count();
      console.log(`   - [${t.name.padEnd(22)}]: Queryable ✅ (Rows: ${count})`);
    } catch (err: any) {
      console.error(`   - [${t.name.padEnd(22)}]: Query Failed ❌: ${err.message}`);
      allQueried = false;
    }
  }

  // Verify Prisma Schema compatibility
  console.log('\n4. Schema & Field Compatibility:');
  try {
    const sampleUser = await prisma.user.findFirst();
    const sampleMaterial = await prisma.material.findFirst();
    const sampleQuiz = await prisma.quiz.findFirst();
    console.log(`   - User Schema compatibility: ${sampleUser?.id ? 'COMPATIBLE ✅' : 'UNKNOWN'}`);
    console.log(`   - Material Schema compatibility: ${sampleMaterial?.id ? 'COMPATIBLE ✅' : 'UNKNOWN'}`);
    console.log(`   - Quiz Schema compatibility: ${sampleQuiz?.id ? 'COMPATIBLE ✅' : 'UNKNOWN'}`);
  } catch (err: any) {
    console.error('   - Schema compatibility error ❌:', err.message);
    allQueried = false;
  }

  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log(`PHASE 1 RESULT: ${allQueried ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('====================================================\n');
  return allQueried;
}

verifyPhase1().catch((err) => {
  console.error('Phase 1 encountered fatal error:', err);
  process.exit(1);
});
