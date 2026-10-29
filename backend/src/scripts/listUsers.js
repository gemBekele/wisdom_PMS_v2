import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const prisma = new PrismaClient();

const listUsers = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        position: true,
        branch_code: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log('\n📋 Current Users in System:\n');
    console.log('='.repeat(80));
    
    if (users.length === 0) {
      console.log('No users found in the system.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name || 'N/A'}`);
        console.log(`   Employee ID: ${user.employeeId || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Position: ${user.position || 'N/A'}`);
        console.log(`   Branch Code: ${user.branch_code || 'N/A'}`);
        console.log(`   Status: ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal Users: ${users.length}\n`);

    // Show default admin credentials
    const admin = users.find(u => u.email === 'admin@sako.com' || u.role === 'admin');
    if (admin) {
      console.log('🔑 Default Admin Credentials:');
      console.log('   Email: admin@sako.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change password after first login!\n');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

listUsers();
