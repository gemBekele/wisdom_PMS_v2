import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Full Hierarchy Seed ---');

    const salt = await bcrypt.genSalt(10);
    const commonPassword = await bcrypt.hash('password123', salt);
    const adminPassword = await bcrypt.hash('admin123', salt);

    // 1. Create Region
    const region = await prisma.region.upsert({
        where: { code: 'REG01' },
        update: {},
        create: {
            name: 'North Region',
            code: 'REG01',
        },
    });
    console.log(`Region created: ${region.name}`);

    // 2. Create Area
    const area = await prisma.area.upsert({
        where: { code: 'AREA01' },
        update: {},
        create: {
            name: 'Atote Area',
            code: 'AREA01',
            regionId: region.id,
        },
    });
    console.log(`Area created: ${area.name}`);

    // 3. Create Branch
    const branch = await prisma.branch.upsert({
        where: { code: 'ATOTE' },
        update: {},
        create: {
            name: 'Atote Branch',
            code: 'ATOTE',
            regionId: region.id,
            areaId: area.id,
        },
    });
    console.log(`Branch created: ${branch.name}`);

    // 4. Create Admin User
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sako.com' },
        update: {},
        create: {
            employeeId: 'ADMIN001',
            name: 'System Administrator',
            email: 'admin@sako.com',
            password: adminPassword,
            role: 'admin',
            position: 'Accountant', // Dummy for admin schema requirement
            isActive: true,
        },
    });
    console.log(`Admin created: ${admin.email}`);

    // 5. Create Branch Manager
    const bm = await prisma.user.upsert({
        where: { email: 'bm@atote.et' },
        update: {},
        create: {
            employeeId: 'BM001',
            name: 'Abebe Mola',
            email: 'bm@atote.et',
            password: commonPassword,
            role: 'branchManager',
            position: 'Branch_Manager',
            branchId: branch.id,
            branch_code: 'ATOTE',
            regionId: region.id,
            areaId: area.id,
        },
    });
    console.log(`Branch Manager created: ${bm.email}`);

    // Update branch with manager
    await prisma.branch.update({
        where: { id: branch.id },
        data: { managerId: bm.id },
    });

    // 6. Create Line Manager (MSM)
    const msm = await prisma.user.upsert({
        where: { email: 'msm@atote.et' },
        update: {},
        create: {
            employeeId: 'MSM001',
            name: 'Marie Antoinette',
            email: 'msm@atote.et',
            password: commonPassword,
            role: 'lineManager',
            position: 'Member_Service_Manager',
            branchId: branch.id,
            branch_code: 'ATOTE',
        },
    });
    console.log(`MSM created: ${msm.email}`);

    // 7. Create Sub-Team Leader (Accountant)
    const acct = await prisma.user.upsert({
        where: { email: 'acct@atote.et' },
        update: {},
        create: {
            employeeId: 'ACCT001',
            name: 'Hanof Accountant',
            email: 'acct@atote.et',
            password: commonPassword,
            role: 'subTeamLeader',
            position: 'Accountant',
            branchId: branch.id,
            branch_code: 'ATOTE',
        },
    });
    console.log(`Accountant created: ${acct.email}`);

    // 8. Create Staff / MSO
    const mso = await prisma.user.upsert({
        where: { email: 'mso@atote.et' },
        update: {},
        create: {
            employeeId: 'MSO001',
            name: 'Hanof Staff',
            email: 'mso@atote.et',
            password: commonPassword,
            role: 'staff',
            position: 'Member_Service_Officer_I',
            branchId: branch.id,
            branch_code: 'ATOTE',
        },
    });
    console.log(`MSO created: ${mso.email}`);

    // 9. Create Team
    const team = await prisma.team.upsert({
        where: { code: 'ATOTE-TEAM1' },
        update: {},
        create: {
            name: 'Atote Team 1',
            code: 'ATOTE-TEAM1',
            branchId: branch.id,
            managerId: msm.id,
        },
    });
    console.log(`Team created: ${team.name}`);

    // 10. Create Sub-Team
    const subTeam = await prisma.subTeam.upsert({
        where: { code: 'ATOTE-SUBTEAM1' },
        update: {
            members: {
                connect: [{ id: mso.id }],
            },
        },
        create: {
            name: 'Atote Sub-Team 1',
            code: 'ATOTE-SUBTEAM1',
            teamId: team.id,
            branchId: branch.id,
            leaderId: acct.id,
            members: {
                connect: [{ id: mso.id }],
            },
        },
    });
    console.log(`Sub-Team created: ${subTeam.name}`);

    console.log('--- Seed Completed Successfully ---');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
