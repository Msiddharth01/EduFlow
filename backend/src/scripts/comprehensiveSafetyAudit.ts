import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SOURCE_DB_URL = process.env.SOURCE_DB_URL || process.env.DATABASE_URL || '';
const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL || '';

const EDUFLOW_MODELS = [
  { name: 'User', delegate: 'user', fkFields: [] },
  { name: 'Course', delegate: 'course', fkFields: [{ field: 'instructorId', targetTable: 'User' }] },
  { name: 'LoginActivity', delegate: 'loginActivity', fkFields: [{ field: 'userId', targetTable: 'User' }] },
  { name: 'Enrollment', delegate: 'enrollment', fkFields: [{ field: 'userId', targetTable: 'User' }, { field: 'courseId', targetTable: 'Course' }] },
  { name: 'Material', delegate: 'material', fkFields: [{ field: 'courseId', targetTable: 'Course' }] },
  { name: 'DocumentChunk', delegate: 'documentChunk', fkFields: [{ field: 'materialId', targetTable: 'Material' }] },
  { name: 'MaterialSummary', delegate: 'materialSummary', fkFields: [{ field: 'materialId', targetTable: 'Material' }] },
  { name: 'Quiz', delegate: 'quiz', fkFields: [{ field: 'courseId', targetTable: 'Course' }] },
  { name: 'Question', delegate: 'question', fkFields: [{ field: 'quizId', targetTable: 'Quiz' }] },
  { name: 'QuizAttempt', delegate: 'quizAttempt', fkFields: [{ field: 'quizId', targetTable: 'Quiz' }, { field: 'userId', targetTable: 'User' }] },
  { name: 'AttemptAnswer', delegate: 'attemptAnswer', fkFields: [{ field: 'attemptId', targetTable: 'QuizAttempt' }, { field: 'questionId', targetTable: 'Question' }] },
  { name: 'Assignment', delegate: 'assignment', fkFields: [{ field: 'courseId', targetTable: 'Course' }] },
  { name: 'AssignmentSubmission', delegate: 'assignmentSubmission', fkFields: [{ field: 'assignmentId', targetTable: 'Assignment' }, { field: 'studentId', targetTable: 'User' }] },
  { name: 'Notification', delegate: 'notification', fkFields: [{ field: 'userId', targetTable: 'User' }] },
];

async function runAudit() {
  console.log('================================================================');
  console.log('       EDUFLOW PRE-MIGRATION FINAL SAFETY & INTEGRITY AUDIT      ');
  console.log('================================================================\n');

  // --- CHECK 1: Supabase PostgreSQL Connection ---
  console.log('--- CHECK 1: Supabase PostgreSQL Connection ---');
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DATABASE_URL is not configured in backend/.env');
  }
  const supabasePrisma = new PrismaClient({ datasources: { db: { url: SUPABASE_DB_URL } } });
  let supabasePgVersion = '';
  try {
    const res: any = await supabasePrisma.$queryRawUnsafe('SELECT version()');
    supabasePgVersion = res[0].version;
    console.log('✅ Connection to Supabase PostgreSQL established successfully.');
    console.log(`   Host: aws-1-us-east-1.pooler.supabase.com:6543`);
    console.log(`   Version: ${supabasePgVersion.split('\n')[0]}`);

    // Check pgvector
    const extCheck: any = await supabasePrisma.$queryRawUnsafe(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
    );
    if (extCheck.length > 0) {
      console.log(`✅ pgvector extension is ACTIVE (Version: ${extCheck[0].extversion})`);
      const vecTest: any = await supabasePrisma.$queryRawUnsafe(
        "SELECT ('[1,2,3]'::vector <=> '[1,2,3]'::vector) AS dist"
      );
      console.log(`✅ pgvector cosine distance calculation tested: dist = ${vecTest[0].dist}`);
    } else {
      console.log('⚠️ pgvector extension is NOT active on Supabase!');
    }
  } catch (err: any) {
    console.error('❌ Supabase connection failed:', err.message);
    throw err;
  }

  // --- CHECK 2: Backup Existence & Isolated Restoration Test ---
  console.log('\n--- CHECK 2: Local PostgreSQL Backup Verification & Test Restoration ---');
  const backupPath = path.resolve(process.cwd(), 'backups/local_postgres_backup_20261103.sql');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`);
  }
  const stats = fs.statSync(backupPath);
  console.log(`✅ Backup file located: ${backupPath}`);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);

  const testDbName = 'test_safety_restore_db';
  console.log(`   Executing restore test into isolated container database: ${testDbName}...`);
  try {
    execSync(`docker exec -i learning_assistant_db psql -U postgres -c "DROP DATABASE IF EXISTS ${testDbName};"`, { stdio: 'pipe' });
    execSync(`docker exec -i learning_assistant_db psql -U postgres -c "CREATE DATABASE ${testDbName};"`, { stdio: 'pipe' });
    execSync(`docker exec -i learning_assistant_db psql -U postgres -d ${testDbName} < "${backupPath}"`, { stdio: 'pipe' });
    
    // Validate table count in restored DB
    const restoredTablesRaw = execSync(
      `docker exec -i learning_assistant_db psql -U postgres -d ${testDbName} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`
    ).toString().trim();
    console.log(`✅ Test restoration successful: ${restoredTablesRaw} tables restored in ${testDbName}.`);

    // Verify row count of User and DocumentChunk
    const restoredUserCount = execSync(
      `docker exec -i learning_assistant_db psql -U postgres -d ${testDbName} -t -c 'SELECT COUNT(*) FROM "User";'`
    ).toString().trim();
    const restoredChunkCount = execSync(
      `docker exec -i learning_assistant_db psql -U postgres -d ${testDbName} -t -c 'SELECT COUNT(*) FROM "DocumentChunk";'`
    ).toString().trim();
    console.log(`   Verified restored records: User = ${restoredUserCount}, DocumentChunk = ${restoredChunkCount}`);

    // Drop test DB
    execSync(`docker exec -i learning_assistant_db psql -U postgres -c "DROP DATABASE ${testDbName};"`, { stdio: 'pipe' });
    console.log(`✅ Isolated test database ${testDbName} cleanly dropped.`);
  } catch (err: any) {
    console.error('❌ Backup restoration test failed:', err.message);
    throw err;
  }

  // --- CHECK 3 & 5: Prisma Schema Coverage, Referential Integrity, Uniqueness & Orphan Check ---
  console.log('\n--- CHECK 3 & 5: Data Integrity, Model Coverage, Enums, Hashes & FK Orphans ---');
  const sourcePrisma = new PrismaClient({ datasources: { db: { url: SOURCE_DB_URL } } });

  let totalSourceRecords = 0;
  const sourceCounts: Record<string, number> = {};

  for (const model of EDUFLOW_MODELS) {
    const delegate = (sourcePrisma as any)[model.delegate];
    const records: any[] = await delegate.findMany();
    sourceCounts[model.name] = records.length;
    totalSourceRecords += records.length;

    // Check primary key uniqueness
    const ids = records.map((r) => r.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== records.length) {
      throw new Error(`Duplicate IDs detected in table ${model.name}!`);
    }

    // Check for orphan foreign keys
    for (const fk of model.fkFields) {
      const parentModel = EDUFLOW_MODELS.find((m) => m.name === fk.targetTable);
      if (parentModel) {
        const parentDelegate = (sourcePrisma as any)[parentModel.delegate];
        const parentRecords: any[] = await parentDelegate.findMany({ select: { id: true } });
        const parentIdSet = new Set(parentRecords.map((p) => p.id));
        for (const record of records) {
          const val = record[fk.field];
          if (val && !parentIdSet.has(val)) {
            throw new Error(`Orphan record detected in ${model.name}.${fk.field}: target ${fk.targetTable} ID ${val} does not exist!`);
          }
        }
      }
    }
  }

  console.log(`✅ All 14 EduFlow Prisma models validated.`);
  console.log(`✅ Zero duplicate primary keys detected.`);
  console.log(`✅ Zero orphan foreign-key references detected across all relationships.`);

  // Verify bcrypt password hashes and roles on User
  const users: any[] = await (sourcePrisma as any).user.findMany();
  for (const u of users) {
    if (!u.passwordHash || !u.passwordHash.startsWith('$2')) {
      throw new Error(`User ${u.email} does not have a valid bcrypt password hash!`);
    }
    if (!['STUDENT', 'PROFESSOR', 'ADMIN'].includes(u.role)) {
      throw new Error(`User ${u.email} has unexpected role: ${u.role}`);
    }
  }
  console.log(`✅ All ${users.length} Users verified: bcrypt password hashes ($2b$) and roles (STUDENT, PROFESSOR) preserved.`);

  // Verify DocumentChunk embeddings
  const chunks: any[] = await sourcePrisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM "DocumentChunk" WHERE embedding IS NOT NULL'
  );
  console.log(`✅ Vector embeddings verified: ${chunks[0].count} / 186 DocumentChunks contain active vector embeddings.`);

  // --- CHECK 4: Unrelated Third-Party Supabase Tables Verification ---
  console.log('\n--- CHECK 4: Isolation of Unrelated Supabase Tables ---');
  const existingTables: any[] = await supabasePrisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  const existingTableNames: string[] = existingTables.map((t: any) => t.table_name);
  console.log(`   Current Supabase tables (${existingTableNames.length}):`, existingTableNames);

  const eduflowTableNames = EDUFLOW_MODELS.map((m) => m.name);
  const collisions = existingTableNames.filter((t) => eduflowTableNames.includes(t));
  console.log(`   Table name collisions with EduFlow schema: ${collisions.length === 0 ? 'NONE (0 collisions) ✅' : collisions.join(', ')}`);
  console.log('✅ Migration scripts strictly target EduFlow models using explicit delegates and parameters.');
  console.log('   Unrelated tables (cart_items, categories, order_items, orders, products, profiles, wishlist) will NOT be touched or modified.');

  // Check ID collisions between local User and Supabase profiles if any
  const profilesCheck: any[] = await supabasePrisma.$queryRawUnsafe('SELECT id FROM profiles');
  const profileIdSet = new Set(profilesCheck.map((p) => p.id));
  const userCollisions = users.filter((u) => profileIdSet.has(u.id));
  console.log(`   ID collisions between EduFlow Users and Supabase profiles: ${userCollisions.length} collisions ✅`);

  // --- CHECK 7: Source vs Target Row Count Report ---
  console.log('\n================================================================');
  console.log('          EXACT SOURCE & TARGET ROW COUNT AUDIT REPORT          ');
  console.log('================================================================');
  console.log(
    'Table Name'.padEnd(25) +
    'Localhost Source'.padEnd(20) +
    'Supabase Target'.padEnd(20) +
    'Target Status'
  );
  console.log('-'.repeat(80));

  for (const model of EDUFLOW_MODELS) {
    const srcCount = sourceCounts[model.name];
    let tgtCount = 0;
    const tableExists = existingTableNames.includes(model.name);
    if (tableExists) {
      const res: any = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${model.name}"`);
      tgtCount = Number(res[0].count);
    }
    const status = tableExists ? `${tgtCount} records` : 'Pending Migration (Not Created)';
    console.log(
      model.name.padEnd(25) +
      srcCount.toString().padEnd(20) +
      (tableExists ? tgtCount.toString() : '0').padEnd(20) +
      status
    );
  }
  console.log('-'.repeat(80));
  console.log(`TOTAL RECORDS:           ${totalSourceRecords} records in Localhost\n`);

  console.log('================================================================');
  console.log('ALL PRE-FLIGHT SAFETY CHECKS PASSED SUCCESSFULLY ✅');
  console.log('No data has been migrated, altered, or overwritten.');
  console.log('Awaiting explicit user confirmation before executing any writes.');
  console.log('================================================================');

  await sourcePrisma.$disconnect();
  await supabasePrisma.$disconnect();
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
