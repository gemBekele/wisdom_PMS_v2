import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    employeeId: 'ADMIN001',
    name: 'System Administrator',
    email: 'admin@wisdomsaccos.com',
    legacyEmail: 'admin@sako.com',
    password: 'admin123',
    role: 'admin',
    position: 'Branch_Manager',
  },
  {
    employeeId: 'AM001',
    name: 'Alem Area Manager',
    email: 'areamanager@wisdomsaccos.com',
    legacyEmail: 'area@sako.com',
    password: 'area123',
    role: 'areaManager',
    position: 'Area_Manager',
  },
  {
    employeeId: 'BM001',
    name: 'Abebe Branch Manager',
    email: 'branchmanager@wisdomsaccos.com',
    legacyEmail: 'branch@sako.com',
    password: 'branch123',
    role: 'branchManager',
    position: 'Branch_Manager',
  },
  {
    employeeId: 'SUP001',
    name: 'Sara Supervisor',
    email: 'supervisor@wisdomsaccos.com',
    legacyEmail: 'supervisor@sako.com',
    password: 'supervisor123',
    role: 'supervisor',
    position: 'Operation_Supervisor',
  },
  {
    employeeId: 'STAFF001',
    name: 'Selam Staff',
    email: 'staff@wisdomsaccos.com',
    legacyEmail: 'staff@sako.com',
    password: 'staff123',
    role: 'staff',
    position: 'Customer_Service_Officer_I',
  },
];

const seedDemoUsers = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    const region = await prisma.region.upsert({
      where: { code: 'DEMO-REG' },
      update: {},
      create: { name: 'Demo Region', code: 'DEMO-REG' },
    });

    const area = await prisma.area.upsert({
      where: { code: 'DEMO-AREA' },
      update: {},
      create: { name: 'Demo Area', code: 'DEMO-AREA', regionId: region.id },
    });

    const branch = await prisma.branch.upsert({
      where: { code: 'DEMO-BRANCH' },
      update: {},
      create: { name: 'Demo Branch', code: 'DEMO-BRANCH', areaId: area.id },
    });

    const created = {};
    for (const demo of DEMO_USERS) {
      const alreadyMigrated = await prisma.user.findUnique({ where: { email: demo.email } });
      if (!alreadyMigrated && demo.legacyEmail) {
        await prisma.user.updateMany({
          where: { email: demo.legacyEmail },
          data: { email: demo.email },
        });
      }

      const hashedPassword = await bcrypt.hash(demo.password, 10);
      const data = {
        employeeId: demo.employeeId,
        name: demo.name,
        email: demo.email,
        password: hashedPassword,
        role: demo.role,
        position: demo.position,
        isActive: true,
        branchId: demo.role === 'admin' ? null : branch.id,
        branch_code: demo.role === 'admin' ? null : branch.code,
        areaId: ['admin', 'staff', 'supervisor'].includes(demo.role) ? null : area.id,
      };

      created[demo.role] = await prisma.user.upsert({
        where: { email: demo.email },
        update: data,
        create: data,
      });
      console.log(`✅ ${demo.role.padEnd(14)} ${demo.email} / ${demo.password}`);
    }

    await prisma.area.update({
      where: { id: area.id },
      data: { managerId: created.areaManager.id },
    });
    await prisma.branch.update({
      where: { id: branch.id },
      data: { managerId: created.branchManager.id },
    });

    console.log('\n✅ Demo users ready. Demo branch: DEMO-BRANCH\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedDemoUsers();
