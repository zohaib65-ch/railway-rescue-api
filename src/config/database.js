'use strict';

const { PrismaClient } = require('@prisma/client');

// ─── SINGLETON ────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
});

// ─── CONNECTION ───────────────────────────────────────────────────────────────

/**
 * Connects to PostgreSQL via Prisma and ensures the partial unique index
 * on trainNumber (for active trains) exists as a DB-level safety net.
 *
 * The index is only active for rows where status = 'active' AND deletedAt IS NULL,
 * which means the same train number can be reused after completion/cancellation
 * without any extra cleanup.
 */
async function connectDB() {
  try {
    await prisma.$connect();

    // Create the partial unique index if it doesn't already exist.
    // This acts as the final safety net against concurrent duplicate requests
    // that slip past the application-layer check in trainService.js.
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_trainNumber"
      ON "Train" ("trainNumber")
      WHERE "status" = 'active' AND "deletedAt" IS NULL;
    `);

    console.log('✅  PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { prisma, connectDB };
