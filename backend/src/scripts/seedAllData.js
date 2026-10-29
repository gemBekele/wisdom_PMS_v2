import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding minimal data for SAKO PMS...\n');

  // Clear existing data using Prisma client (respecting FK order)
  await prisma.evaluationApproval.deleteMany();
  await prisma.performanceScore.deleteMany();
  await prisma.behavioralEvaluation.deleteMany();
  await prisma.taskApproval.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.accountMapping.deleteMany();
  await prisma.juneBalance.deleteMany();
  await prisma.planShareConfig.deleteMany();
  await prisma.productKpiMapping.deleteMany();
  await prisma.staffPlan.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.subTeam.deleteMany();
  await prisma.team.deleteMany();
  await prisma.region.updateMany({ where: { directorId: { not: null } }, data: { directorId: null } });
  await prisma.area.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.branch.updateMany({ where: { managerId: { not: null } }, data: { managerId: null } });
  await prisma.user.deleteMany({ where: { email: { not: 'admin@sako.com' } } });
  await prisma.branch.deleteMany();
  await prisma.area.deleteMany();
  await prisma.region.deleteMany();

  const hashedPwd = await bcrypt.hash('1234', 10);

  // 1. South Region
  const region = await prisma.region.create({
    data: { name: 'South Region', code: 'SOUTH', isActive: true },
  });
  console.log('✅ South Region created');

  // 2. Hawassa Area
  const area = await prisma.area.create({
    data: { name: 'Hawassa Area', code: 'HAWASSA_AREA', regionId: region.id, isActive: true },
  });
  console.log('✅ Hawassa Area created');

  // 3. Regional Director
  const rd = await prisma.user.create({
    data: {
      name: 'Getachew Lemma',
      email: 'getachew.lemma@south.gov.et',
      password: hashedPwd,
      role: 'regionalDirector',
      position: 'Regional_Director',
      employeeId: 'RD-SOUTH-001',
      regionId: region.id,
      isActive: true,
    },
  });
  await prisma.region.update({ where: { id: region.id }, data: { directorId: rd.id } });
  console.log(`✅ Regional Director: ${rd.name}`);

  // 4. Area Manager
  const am = await prisma.user.create({
    data: {
      name: 'Tadesse Woldemariam',
      email: 'tadesse.woldemariam@hawassa_area.et',
      password: hashedPwd,
      role: 'areaManager',
      position: 'Area_Manager',
      employeeId: 'AM-HAW-001',
      regionId: region.id,
      areaId: area.id,
      isActive: true,
    },
  });
  await prisma.area.update({ where: { id: area.id }, data: { managerId: am.id } });
  console.log(`✅ Area Manager: ${am.name}`);

  console.log(`\n============================================================`);
  console.log(`✅ MINIMAL DATA SEEDED SUCCESSFULLY!`);
  console.log(`============================================================`);
  console.log(`\n📋 LOGIN CREDENTIALS:`);
  console.log(`   Admin:              admin@sako.com / admin123`);
  console.log(`   Regional Director:  getachew.lemma@south.gov.et / 1234`);
  console.log(`   Area Manager:       tadesse.woldemariam@hawassa_area.et / 1234`);
  console.log(`\n⚠️  Use seedGhionSaccos.js to seed full branch + staff data.`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
