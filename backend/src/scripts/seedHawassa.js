// DEPRECATED: This script was for the old "Hawassa Main Branch" which has been removed.
// Use seedGhionSaccos.js instead which seeds only Hawassa Bole Branch.
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const pr = new PrismaClient();
async function main() {
  console.log('⚠️  seedHawassa.js is deprecated. Hawassa Main Branch no longer exists.');
  console.log('    Use seedGhionSaccos.js instead (seeds Hawassa Bole only).');
  await pr.$disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); pr.$disconnect(); process.exit(1); });
