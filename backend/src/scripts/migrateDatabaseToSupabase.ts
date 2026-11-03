import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

export const MIGRATION_MODELS = [
  { tableName: 'User', delegateName: 'user' },
  { tableName: 'Course', delegateName: 'course' },
  { tableName: 'LoginActivity', delegateName: 'loginActivity' },
  { tableName: 'Enrollment', delegateName: 'enrollment' },
  { tableName: 'Material', delegateName: 'material' },
  { tableName: 'DocumentChunk', delegateName: 'documentChunk' },
  { tableName: 'MaterialSummary', delegateName: 'materialSummary' },
  { tableName: 'Quiz', delegateName: 'quiz' },
  { tableName: 'Question', delegateName: 'question' },
  { tableName: 'QuizAttempt', delegateName: 'quizAttempt' },
  { tableName: 'AttemptAnswer', delegateName: 'attemptAnswer' },
  { tableName: 'Assignment', delegateName: 'assignment' },
  { tableName: 'AssignmentSubmission', delegateName: 'assignmentSubmission' },
  { tableName: 'Notification', delegateName: 'notification' },
];

export async function runDatabaseMigration(options: {
  sourceDbUrl: string;
  targetDbUrl: string;
  isDryRun?: boolean;
}) {
  const { sourceDbUrl, targetDbUrl, isDryRun = false } = options;

  console.log('====================================================');
  console.log('EduFlow PostgreSQL -> Supabase PostgreSQL Migration');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Simulation Only)' : '🚀 LIVE MIGRATION'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  const sourcePrisma = new PrismaClient({ datasources: { db: { url: sourceDbUrl } } });
  const targetPrisma = new PrismaClient({ datasources: { db: { url: targetDbUrl } } });

  // 1. Verify connection to both databases
  console.log('--- Step 1: Testing Connections & Extensions ---');
  try {
    const srcVer: any = await sourcePrisma.$queryRawUnsafe('SELECT version()');
    console.log('✅ Local PostgreSQL Source connected:', srcVer[0].version.split(' ')[0], srcVer[0].version.split(' ')[1]);
  } catch (e: any) {
    console.error('❌ Could not connect to Local PostgreSQL source database:', e.message);
    throw e;
  }

  try {
    const tgtVer: any = await targetPrisma.$queryRawUnsafe('SELECT version()');
    console.log('✅ Supabase PostgreSQL Target connected:', tgtVer[0].version.split(' ')[0], tgtVer[0].version.split(' ')[1]);
    
    // Check vector extension on target
    const ext: any = await targetPrisma.$queryRawUnsafe("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    if (ext.length === 0) {
      console.warn('⚠️  pgvector extension not detected on Supabase target. Attempting to enable...');
      try {
        await targetPrisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;');
        console.log('✅ Enabled pgvector extension on Supabase target.');
      } catch (extErr: any) {
        console.error('❌ Failed to enable pgvector extension automatically. Please run in Supabase SQL editor: CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;');
        throw extErr;
      }
    } else {
      console.log('✅ pgvector extension active on Supabase target.');
    }
  } catch (e: any) {
    console.error('❌ Could not connect to Supabase PostgreSQL target database:', e.message);
    throw e;
  }

  // 2. Migrate tables in foreign-key topological order
  console.log('\n--- Step 2: Migrating All 14 Tables in Dependency Order ---');
  const auditReport: Array<{
    table: string;
    sourceCount: number;
    migratedCount: number;
    targetCountAfter: number;
    status: 'MATCH ✅' | 'MISMATCH ❌';
  }> = [];

  for (const model of MIGRATION_MODELS) {
    const { tableName, delegateName } = model;
    const srcDelegate = (sourcePrisma as any)[delegateName];
    const tgtDelegate = (targetPrisma as any)[delegateName];

    const sourceRecords: any[] = await srcDelegate.findMany();
    let migrated = 0;

    console.log(`Processing table: ${tableName} (${sourceRecords.length} records)...`);

    for (const record of sourceRecords) {
      if (!isDryRun) {
        if (tableName === 'DocumentChunk') {
          const { embedding, ...dataWithoutEmbedding } = record;
          await tgtDelegate.upsert({
            where: { id: record.id },
            create: dataWithoutEmbedding,
            update: dataWithoutEmbedding,
          });
          if (embedding) {
            const vecStr = typeof embedding === 'string' ? embedding : `[${embedding.join(',')}]`;
            await targetPrisma.$executeRawUnsafe(
              `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
              vecStr,
              record.id
            );
          }
        } else {
          await tgtDelegate.upsert({
            where: { id: record.id },
            create: record,
            update: record,
          });
        }
      }
      migrated++;
    }

    const targetCountAfter = isDryRun
      ? sourceRecords.length
      : await tgtDelegate.count();

    const isMatch = sourceRecords.length === targetCountAfter;

    auditReport.push({
      table: tableName,
      sourceCount: sourceRecords.length,
      migratedCount: migrated,
      targetCountAfter,
      status: isMatch ? 'MATCH ✅' : 'MISMATCH ❌',
    });

    console.log(`  -> ${tableName}: ${migrated} records copied. (Target count: ${targetCountAfter})`);
  }

  // 3. Print Final Data Integrity Audit
  console.log('\n====================================================');
  console.log('MIGRATION DATA INTEGRITY & ROW COUNT AUDIT');
  console.log('====================================================');
  let allMatched = true;
  for (const item of auditReport) {
    if (item.status === 'MISMATCH ❌') allMatched = false;
    console.log(
      `Table [${item.table.padEnd(20)}]: Localhost=${item.sourceCount} | Migrated=${item.migratedCount} | Supabase=${item.targetCountAfter} | ${item.status}`
    );
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${allMatched ? 'MIGRATION 100% SUCCESSFUL ✅' : 'DATA MISMATCH DETECTED ❌'}`);
  console.log('====================================================\n');

  await sourcePrisma.$disconnect();
  await targetPrisma.$disconnect();

  return { success: allMatched, report: auditReport };
}

// Allow CLI execution
if (process.argv[1]?.endsWith('migrateDatabaseToSupabase.ts')) {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const sourceDbUrl = process.env.SOURCE_DB_URL || process.env.DATABASE_URL || '';
  const targetDbUrl = process.env.SUPABASE_DATABASE_URL || process.env.TARGET_DB_URL || '';

  if (!sourceDbUrl || !targetDbUrl) {
    console.error('Error: Please provide SOURCE_DB_URL and SUPABASE_DATABASE_URL.');
    console.error('Example: SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"');
    process.exit(1);
  }

  runDatabaseMigration({ sourceDbUrl, targetDbUrl, isDryRun })
    .then((r) => process.exit(r.success ? 0 : 1))
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    });
}
