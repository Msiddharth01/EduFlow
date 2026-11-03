import { PrismaClient } from '@prisma/client';

export interface ModelSyncConfig {
  tableName: string;
  delegateName: string;
}

// All 14 models in strict forward foreign-key topological order
export const FORWARD_MODELS: ModelSyncConfig[] = [
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

export const REVERSE_MODELS = [...FORWARD_MODELS].reverse();

export interface TableSyncResult {
  tableName: string;
  sourceRows: number;
  targetRowsBefore: number;
  inserted: number;
  updated: number;
  deleted: number;
  targetRowsAfter: number;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export interface SyncReport {
  timestamp: string;
  isDryRun: boolean;
  totalTables: number;
  tables: TableSyncResult[];
  overallStatus: 'SUCCESS' | 'FAILED';
}

/**
 * Type-Safe Reverse Synchronization Engine
 * Operates through Prisma's native model delegates to handle enum types,
 * vector columns, arrays, and timestamp formats with zero schema-casting friction.
 */
export async function executeReverseSync(options: {
  sourceDbUrl: string;
  targetDbUrl: string;
  isDryRun?: boolean;
}): Promise<SyncReport> {
  const { sourceDbUrl, targetDbUrl, isDryRun = false } = options;

  console.log('====================================================');
  console.log('EduFlow Reverse Database Synchronization Engine');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Simulation Only)' : '🚀 LIVE SYNCHRONIZATION'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  const sourceClient = new PrismaClient({ datasources: { db: { url: sourceDbUrl } } });
  const targetClient = new PrismaClient({ datasources: { db: { url: targetDbUrl } } });

  const tableResults: TableSyncResult[] = [];

  try {
    // Phase 1: Forward Upsert (Inserts & Updates in topological FK order)
    console.log('--- Phase 1: Forward Upsert (Inserts & Updates in FK Order) ---');
    for (const model of FORWARD_MODELS) {
      const { tableName, delegateName } = model;
      const sourceDelegate = (sourceClient as any)[delegateName];
      const targetDelegate = (targetClient as any)[delegateName];

      const sourceRows: any[] = await sourceDelegate.findMany();
      const targetRowsBefore: any[] = await targetDelegate.findMany();
      const targetMap = new Map<string, any>(targetRowsBefore.map((r) => [r.id, r]));

      let insertedCount = 0;
      let updatedCount = 0;

      for (const row of sourceRows) {
        const existing = targetMap.get(row.id);

        if (!existing) {
          insertedCount++;
          if (!isDryRun) {
            // For DocumentChunk, strip unsupported embedding from object payload and insert via executeRaw if embedding exists
            if (tableName === 'DocumentChunk') {
              const { embedding, ...dataWithoutEmbedding } = row;
              await targetDelegate.create({ data: dataWithoutEmbedding });
              if (embedding) {
                const vecStr = typeof embedding === 'string' ? embedding : `[${embedding.join(',')}]`;
                await targetClient.$executeRawUnsafe(
                  `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
                  vecStr,
                  row.id
                );
              }
            } else {
              await targetDelegate.create({ data: row });
            }
          }
        } else {
          // Detect if any field was updated
          const isModified = Object.keys(row).some((key) => {
            if (key === 'embedding' || key === 'updatedAt') return false;
            const v1 = row[key] instanceof Date ? row[key].getTime() : JSON.stringify(row[key]);
            const v2 = existing[key] instanceof Date ? existing[key].getTime() : JSON.stringify(existing[key]);
            return v1 !== v2;
          });

          if (isModified) {
            updatedCount++;
            if (!isDryRun) {
              const { id, embedding, ...updatePayload } = row;
              await targetDelegate.update({
                where: { id },
                data: updatePayload,
              });
              if (tableName === 'DocumentChunk' && embedding) {
                const vecStr = typeof embedding === 'string' ? embedding : `[${embedding.join(',')}]`;
                await targetClient.$executeRawUnsafe(
                  `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
                  vecStr,
                  id
                );
              }
            }
          }
        }
      }

      tableResults.push({
        tableName,
        sourceRows: sourceRows.length,
        targetRowsBefore: targetRowsBefore.length,
        inserted: insertedCount,
        updated: updatedCount,
        deleted: 0,
        targetRowsAfter: isDryRun ? targetRowsBefore.length + insertedCount : 0,
        status: 'SUCCESS',
      });

      console.log(`  -> ${tableName}: +${insertedCount} new, ~${updatedCount} updated`);
    }

    // Phase 2: Reverse Deletion Reconciliation (Level 5 down to Level 0)
    console.log('\n--- Phase 2: Reverse Deletion Reconciliation (Orphan Cleanup) ---');
    for (const model of REVERSE_MODELS) {
      const { tableName, delegateName } = model;
      const sourceDelegate = (sourceClient as any)[delegateName];
      const targetDelegate = (targetClient as any)[delegateName];

      const sourceRows: any[] = await sourceDelegate.findMany({ select: { id: true } });
      const targetRows: any[] = await targetDelegate.findMany({ select: { id: true } });

      const sourceIdSet = new Set<string>(sourceRows.map((r) => r.id));
      const orphanIds = targetRows.map((r) => r.id).filter((id) => !sourceIdSet.has(id));

      const resultIndex = tableResults.findIndex((r) => r.tableName === tableName);

      if (orphanIds.length > 0) {
        console.log(`  -> Detected ${orphanIds.length} deleted records in ${tableName}. Reconciling...`);
        if (!isDryRun) {
          for (const orphanId of orphanIds) {
            await targetDelegate.delete({ where: { id: orphanId } });
          }
        }
        if (resultIndex >= 0) {
          tableResults[resultIndex].deleted = orphanIds.length;
        }
      }

      // Re-query targetRowsAfter
      if (!isDryRun && resultIndex >= 0) {
        const afterCount = await targetDelegate.count();
        tableResults[resultIndex].targetRowsAfter = afterCount;
      }
    }

    console.log('\n====================================================');
    console.log('REVERSE SYNCHRONIZATION AUDIT REPORT');
    console.log('====================================================');
    for (const res of tableResults) {
      console.log(
        `Table [${res.tableName.padEnd(20)}]: Source=${res.sourceRows} | TargetBefore=${res.targetRowsBefore} | +${res.inserted} / ~${res.updated} / -${res.deleted} | TargetAfter=${res.targetRowsAfter}`
      );
    }

    await sourceClient.$disconnect();
    await targetClient.$disconnect();

    return {
      timestamp: new Date().toISOString(),
      isDryRun,
      totalTables: tableResults.length,
      tables: tableResults,
      overallStatus: 'SUCCESS',
    };
  } catch (err: any) {
    console.error('Fatal reverse sync error:', err);
    await sourceClient.$disconnect();
    await targetClient.$disconnect();
    return {
      timestamp: new Date().toISOString(),
      isDryRun,
      totalTables: tableResults.length,
      tables: tableResults,
      overallStatus: 'FAILED',
    };
  }
}

// Allow CLI execution
if (process.argv[1]?.endsWith('reverseSyncDatabase.ts')) {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const sourceDbUrl = process.env.SOURCE_DB_URL || '';
  const targetDbUrl = process.env.TARGET_DB_URL || process.env.DATABASE_URL || '';

  if (!sourceDbUrl || !targetDbUrl) {
    console.error('Error: Please provide SOURCE_DB_URL and TARGET_DB_URL environment variables.');
    process.exit(1);
  }

  executeReverseSync({ sourceDbUrl, targetDbUrl, isDryRun })
    .then((report) => {
      console.log(`\nReverse sync completed with status: ${report.overallStatus}`);
      process.exit(report.overallStatus === 'SUCCESS' ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
