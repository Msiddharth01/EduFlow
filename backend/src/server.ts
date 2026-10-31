import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { prisma } from './config/db.js';

const PORT = process.env.PORT || 5001;

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully.');
  } catch (err: any) {
    console.warn('⚠️ Warning: PostgreSQL not yet connected. Ensure Docker or Postgres service is running.');
    console.warn(`   Detail: ${err.message}`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
    console.log(`🩺 Health check at http://localhost:${PORT}/api/health`);
  });
}

bootstrap();
