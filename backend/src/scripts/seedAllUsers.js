import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const seedAllUsers = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Delete all existing users
    await prisma.user.deleteMany({});
    console.log('✅ Cleared existing users\n');

    const usersData = [
      { employeeId: 'ADMIN001', name: 'System Administrator', email: 'admin@sako.com', password: 'admin123', role: 'admin', position: 'Branch_Manager', isActive: true },
      { employeeId: 'RD001', name: 'Regional Director Test', email: 'regional@sako.com', password: 'regional123', role: 'regionalDirector', position: 'Regional_Director', isActive: true },
      { employeeId: 'AM001', name: 'Area Manager Test', email: 'areamanager@sako.com', password: 'area123', role: 'areaManager', position: 'Area_Manager', isActive: true },
      { employeeId: 'BM001', name: 'Branch Manager Test', email: 'branchmanager@sako.com', password: 'branch123', role: 'branchManager', position: 'Branch_Manager', isActive: true },
      { employeeId: 'LM001', name: 'Line Manager Test', email: 'linemanager@sako.com', password: 'line123', role: 'lineManager', position: 'Member_Service_Manager', isActive: true },
      { employeeId: 'STL001', name: 'Sub-Team Leader Test', email: 'subteam@sako.com', password: 'subteam123', role: 'subTeamLeader', position: 'Accountant', isActive: true },
      { employeeId: 'STAFF001', name: 'Staff Member Test', email: 'staff@sako.com', password: 'staff123', role: 'staff', position: 'Member_Service_Officer_I', isActive: true },
    ];

    for (const userData of usersData) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      await prisma.user.create({
        data: {
          employeeId: userData.employeeId,
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          position: userData.position,
          isActive: userData.isActive,
        },
      });
    }

    console.log('\n✅ All users created successfully!\n');
    console.log('📋 LOGIN CREDENTIALS:\n');
    console.log('Admin:              admin@sako.com | admin123');
    console.log('Regional Director:  regional@sako.com | regional123');
    console.log('Area Manager:       areamanager@sako.com | area123');
    console.log('Branch Manager:     branchmanager@sako.com | branch123');
    console.log('Line Manager:       linemanager@sako.com | line123');
    console.log('Sub-Team Leader:    subteam@sako.com | subteam123');
    console.log('Staff / MSO:        staff@sako.com | staff123');
    console.log('\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedAllUsers();
