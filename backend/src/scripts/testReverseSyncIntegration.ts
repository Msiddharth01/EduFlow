import { PrismaClient } from '@prisma/client';
import { executeReverseSync } from './reverseSyncDatabase.js';

async function runIntegrationTest() {
  const sourceUrl = 'postgresql://postgres:postgrespassword@localhost:5432/test_source_db?schema=public';
  const targetUrl = 'postgresql://postgres:postgrespassword@localhost:5432/test_target_db?schema=public';

  const sourcePrisma = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const targetPrisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  console.log('--- Step 1: Simulating Live Activity on Source Database ---');

  // 1. Insert new User on source
  const newUserId = '11111111-2222-3333-4444-555555555555';
  await sourcePrisma.user.create({
    data: {
      id: newUserId,
      email: 'alex_test_student@eduflow.com',
      passwordHash: '$2a$10$e8w67wK1L8y1/Kx87fL6ee9Fj5.L69YVdDk1bY6E9aX3X1W4Y6Z9e',
      name: 'Alex Test Student',
      role: 'STUDENT',
    },
  });
  console.log('✅ Created new User on Source DB');

  // 2. Insert new Course on source
  const newCourseId = '22222222-3333-4444-5555-666666666666';
  await sourcePrisma.course.create({
    data: {
      id: newCourseId,
      code: 'CS999',
      title: 'Distributed Systems & Cloud Architecture',
      description: 'Advanced course created during cloud session',
    },
  });
  console.log('✅ Created new Course on Source DB');

  // 3. Update an existing AssignmentSubmission on source
  const existingSub = await sourcePrisma.assignmentSubmission.findFirst();
  if (existingSub) {
    await sourcePrisma.assignmentSubmission.update({
      where: { id: existingSub.id },
      data: {
        grade: 97.5,
        feedback: 'Excellent work, verified via reverse-sync test!',
      },
    });
    console.log(`✅ Updated grade for submission ${existingSub.id} on Source DB`);
  }

  // 4. Delete an existing Notification on source
  const notifToDelete = await sourcePrisma.notification.findFirst();
  let deletedNotifId = '';
  if (notifToDelete) {
    deletedNotifId = notifToDelete.id;
    await sourcePrisma.notification.delete({ where: { id: deletedNotifId } });
    console.log(`✅ Deleted notification ${deletedNotifId} on Source DB`);
  }

  console.log('\n--- Step 2: Executing Reverse Sync to Target Database ---');
  const report = await executeReverseSync({
    sourceDbUrl: sourceUrl,
    targetDbUrl: targetUrl,
    isDryRun: false,
  });

  console.log('\n--- Step 3: Verifying Target Database State ---');

  // Verify inserted user exists on target
  const syncedUser = await targetPrisma.user.findUnique({ where: { id: newUserId } });
  const userSynced = syncedUser !== null && syncedUser.email === 'alex_test_student@eduflow.com';
  console.log(`1. New User insertion synchronized: ${userSynced ? 'VERIFIED ✅' : 'FAILED ❌'}`);

  // Verify inserted course exists on target
  const syncedCourse = await targetPrisma.course.findUnique({ where: { id: newCourseId } });
  const courseSynced = syncedCourse !== null && syncedCourse.code === 'CS999';
  console.log(`2. New Course insertion synchronized: ${courseSynced ? 'VERIFIED ✅' : 'FAILED ❌'}`);

  // Verify update on target
  let updateSynced = false;
  if (existingSub) {
    const targetSub = await targetPrisma.assignmentSubmission.findUnique({ where: { id: existingSub.id } });
    updateSynced = Boolean(targetSub?.grade === 97.5 && targetSub?.feedback?.includes('verified via reverse-sync test'));
  }
  console.log(`3. AssignmentSubmission update synchronized: ${updateSynced ? 'VERIFIED ✅' : 'FAILED ❌'}`);

  // Verify deletion on target
  let deleteSynced = false;
  if (deletedNotifId) {
    const targetNotif = await targetPrisma.notification.findUnique({ where: { id: deletedNotifId } });
    deleteSynced = targetNotif === null;
  }
  console.log(`4. Notification deletion synchronized: ${deleteSynced ? 'VERIFIED ✅' : 'FAILED ❌'}`);

  const allPassed = userSynced && courseSynced && updateSynced && deleteSynced && report.overallStatus === 'SUCCESS';
  console.log(`\n====================================================`);
  console.log(`OVERALL REVERSE SYNC INTEGRATION TEST: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILED ❌'}`);
  console.log(`====================================================\n`);

  await sourcePrisma.$disconnect();
  await targetPrisma.$disconnect();

  process.exit(allPassed ? 0 : 1);
}

runIntegrationTest();
