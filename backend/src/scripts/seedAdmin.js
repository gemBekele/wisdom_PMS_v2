import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const seedAdmin = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma');

    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@sako.com' },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        employeeId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@sako.com',
        password: hashedPassword,
        role: 'admin',
        position: 'Branch_Manager',
        isActive: true,
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('📧 Email: admin@sako.com');
    console.log('🔑 Password: admin123');
    console.log('\n⚠️  Please change the password after first login!\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedAdmin();
