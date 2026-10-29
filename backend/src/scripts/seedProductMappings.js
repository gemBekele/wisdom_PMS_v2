import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const prisma = new PrismaClient();

// Product mappings from CSV
const productMappings = [
  { cbs_product_name: 'Felagot Saving', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Digital Saving', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Weekly Sa 360', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Medebegna Savin', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Special Saving', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Taxi Saving', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
  { cbs_product_name: 'Fixed Time 1Y', kpi_category: 'Deposit_Mobilization', min_balance: 0, requiresCbs: false },
];

const seedProductMappings = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    // Get admin user
    let admin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'admin' },
          { email: { contains: 'admin', mode: 'insensitive' } },
        ],
      },
    });

    if (!admin) {
      console.error('❌ No admin user found. Please create an admin user first.');
      console.error('   Run: npm run seed');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('🌱 Seeding product mappings...\n');

    let created = 0;
    let updated = 0;

    for (const mappingData of productMappings) {
      const existing = await prisma.productKpiMapping.findUnique({
        where: { cbs_product_name: mappingData.cbs_product_name },
      });

      if (existing) {
        await prisma.productKpiMapping.update({
          where: { cbs_product_name: mappingData.cbs_product_name },
          data: {
            kpi_category: mappingData.kpi_category,
            min_balance: mappingData.min_balance || 0,
            requiresCbs: mappingData.requiresCbs !== undefined ? mappingData.requiresCbs : true,
            status: 'active',
            mappedById: admin.id,
            mapped_at: new Date(),
          },
        });
        updated++;
        console.log(`✅ Updated: ${mappingData.cbs_product_name} → ${mappingData.kpi_category}`);
      } else {
        await prisma.productKpiMapping.create({
          data: {
            cbs_product_name: mappingData.cbs_product_name,
            kpi_category: mappingData.kpi_category,
            min_balance: mappingData.min_balance || 0,
            requiresCbs: mappingData.requiresCbs !== undefined ? mappingData.requiresCbs : true,
            mappedById: admin.id,
            status: 'active',
          },
        });
        created++;
        console.log(`✅ Created: ${mappingData.cbs_product_name} → ${mappingData.kpi_category}`);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${productMappings.length}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding product mappings:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedProductMappings();
