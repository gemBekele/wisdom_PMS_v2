import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const prisma = new PrismaClient();

const removeAllUsersExceptAdmin = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    // Find admin user(s) - check for 'admin' role or email containing 'admin'
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
          { email: { contains: 'admin', mode: 'insensitive' } },
        ],
      },
    });

    console.log(`\n📋 Found ${adminUsers.length} admin user(s) to keep:`);
    adminUsers.forEach((admin) => {
      console.log(`  - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
    });

    // Get admin IDs to exclude from deletion
    const adminIds = adminUsers.map((admin) => admin.id);

    // Count users to be deleted
    const usersToDelete = await prisma.user.count({
      where: {
        id: { notIn: adminIds },
      },
    });

    console.log(`\n🗑️  Found ${usersToDelete} users to delete (excluding admin)`);

    if (usersToDelete === 0) {
      console.log('✅ No users to delete. Only admin user(s) exist.');
      await prisma.$disconnect();
      return;
    }

    // Delete all users except admin
    const result = await prisma.user.deleteMany({
      where: {
        id: { notIn: adminIds },
      },
    });

    console.log(`\n✅ Successfully deleted ${result.count} user(s)`);
    console.log(`\n📊 Remaining users:`);
    const remainingUsers = await prisma.user.findMany();
    remainingUsers.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    await prisma.$disconnect();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Run the script
removeAllUsersExceptAdmin();
