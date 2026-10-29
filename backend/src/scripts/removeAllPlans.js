import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const prisma = new PrismaClient();

const removeAllPlans = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');
    
    const countBefore = await prisma.plan.count();
    console.log(`📋 Found ${countBefore} plan(s) in the database`);
    
    if (countBefore === 0) {
      console.log('✅ No plans to delete.');
      await prisma.$disconnect();
      return;
    }
    
    // First delete related staff plans (foreign key constraint)
    await prisma.staffPlan.deleteMany({});
    console.log('✅ Deleted all staff plans');
    
    // Then delete plans
    const result = await prisma.plan.deleteMany({});
    console.log(`✅ Successfully deleted ${result.count} plan(s) from the database.`);
    
    await prisma.$disconnect();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing plans:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

removeAllPlans();
