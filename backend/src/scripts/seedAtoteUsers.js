import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const seedAtoteUsersAndStructure = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');

    // ========== STEP 1: Create Region and Area (if not exists) ==========
    console.log('🌱 Creating Region and Area...');
    
    let region = await prisma.region.findUnique({
      where: { code: 'SOUTH' },
    });
    
    if (!region) {
      region = await prisma.region.create({
        data: {
          name: 'South Region',
          code: 'SOUTH',
        },
      });
      console.log('✅ Created South Region');
    } else {
      console.log('ℹ️  South Region already exists');
    }

    let area = await prisma.area.findUnique({
      where: { code: 'HAWASSA_AREA' },
    });
    
    if (!area) {
      area = await prisma.area.create({
        data: {
          name: 'Hawassa Area',
          code: 'HAWASSA_AREA',
          regionId: region.id,
        },
      });
      console.log('✅ Created Hawassa Area');
    } else {
      console.log('ℹ️  Hawassa Area already exists');
    }

    // ========== STEP 2: Create ATOTE Branch ==========
    console.log('\n🌱 Creating ATOTE Branch...');
    
    let branch = await prisma.branch.findUnique({
      where: { code: 'ATOTE' },
    });
    
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: 'Atote Branch',
          code: 'ATOTE',
          regionId: region.id,
          areaId: area.id,
          isActive: true,
        },
      });
      console.log('✅ Created Atote Branch (ATOTE)');
    } else {
      console.log('ℹ️  Atote Branch already exists');
    }

    // ========== STEP 3: Create Users ==========
    console.log('\n🌱 Creating Users...');

    const usersData = [
      {
        employeeId: 'BM001',
        name: 'Abebe Mola',
        email: 'bm@atote.et',
        password: 'bm123',
        role: 'branchManager',
        position: 'Branch_Manager',
        branch_code: 'ATOTE',
      },
      {
        employeeId: 'MSM001',
        name: 'Marie Antoinette',
        email: 'msm@atote.et',
        password: 'msm123',
        role: 'lineManager',
        position: 'Member_Service_Manager',
        branch_code: 'ATOTE',
      },
      {
        employeeId: 'ACCT001',
        name: 'Hanof',
        email: 'acct@atote.et',
        password: 'acct123',
        role: 'subTeamLeader',
        position: 'Accountant',
        branch_code: 'ATOTE',
      },
      {
        employeeId: 'MSO001',
        name: 'Hanof',
        email: 'mso@atote.et',
        password: 'mso123',
        role: 'staff',
        position: 'Member_Service_Officer_I',
        branch_code: 'ATOTE',
      },
    ];

    const createdUsers = {};

    for (const userData of usersData) {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`ℹ️  User ${userData.email} already exists`);
        createdUsers[userData.email] = existingUser;
      } else {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Create user
        const user = await prisma.user.create({
          data: {
            employeeId: userData.employeeId,
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            position: userData.position,
            branchId: branch.id,
            branch_code: userData.branch_code,
            isActive: true,
          },
        });
        
        console.log(`✅ Created user: ${user.name} (${user.email}) - ${userData.role}`);
        createdUsers[userData.email] = user;
      }
    }

    // ========== STEP 4: Create Team ==========
    console.log('\n🌱 Creating Team...');
    
    const msmUser = createdUsers['msm@atote.et'];
    
    let team = await prisma.team.findUnique({
      where: { code: 'ATOTE-TEAM1' },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'Atote Team 1',
          code: 'ATOTE-TEAM1',
          branchId: branch.id,
          managerId: msmUser.id,
          isActive: true,
        },
      });
      console.log('✅ Created Team: Atote Team 1 (ATOTE-TEAM1)');
    } else {
      console.log('ℹ️  Team already exists');
    }

    // ========== STEP 5: Create Sub-Team ==========
    console.log('\n🌱 Creating Sub-Team...');
    
    const acctUser = createdUsers['acct@atote.et'];
    const msoUser = createdUsers['mso@atote.et'];
    
    let subTeam = await prisma.subTeam.findUnique({
      where: { code: 'ATOTE-SUBTEAM1' },
    });

    if (!subTeam) {
      subTeam = await prisma.subTeam.create({
        data: {
          name: 'Atote Sub-Team 1',
          code: 'ATOTE-SUBTEAM1',
          teamId: team.id,
          branchId: branch.id,
          leaderId: acctUser.id,
          members: {
            connect: [
              { id: acctUser.id },  // Accountant is also a member
              { id: msoUser.id },   // MSO is a member
            ],
          },
          isActive: true,
        },
      });
      console.log('✅ Created Sub-Team: Atote Sub-Team 1 (ATOTE-SUBTEAM1)');
    } else {
      // Update sub-team to add members if needed
      await prisma.subTeam.update({
        where: { id: subTeam.id },
        data: {
          leaderId: acctUser.id,
          members: {
            connect: [
              { id: acctUser.id },
              { id: msoUser.id },
            ],
          },
        },
      });
      console.log('ℹ️  Sub-Team already exists, updated members');
    }

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📍 BRANCH:');
    console.log(`   ATOTE - Atote Branch`);
    console.log('\n👥 USERS:');
    console.log(`   Branch Manager: bm@atote.et / bm123`);
    console.log(`   Line Manager:   msm@atote.et / msm123`);
    console.log(`   Accountant:     acct@atote.et / acct123`);
    console.log(`   Staff/MSO:      mso@atote.et / mso123`);
    console.log('\n🤝 TEAM:');
    console.log(`   Team: Atote Team 1 (ATOTE-TEAM1)`);
    console.log(`   Manager: Marie Antoinette (msm@atote.et)`);
    console.log('\n👥 SUB-TEAM:');
    console.log(`   Sub-Team: Atote Sub-Team 1 (ATOTE-SUBTEAM1)`);
    console.log(`   Leader: Hanof (acct@atote.et)`);
    console.log(`   Members: Hanof (ACCT), Hanof (MSO)`);
    console.log('\n📊 HIERARCHY:');
    console.log(`   Admin → ATOTE Branch`);
    console.log(`         → Abebe Mola (Branch Manager)`);
    console.log(`         → Marie Antoinette (MSM)`);
    console.log(`         → Hanof (Accountant) + Hanof (MSO)`);
    console.log('\n' + '='.repeat(60));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedAtoteUsersAndStructure();
