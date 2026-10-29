import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@sako.com' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@sako.com',
            password: hashedPassword,
            employeeId: 'ADMIN001',
            role: 'admin',
            position: 'Accountant', // Dummy position for admin
            isActive: true,
        },
    });

    console.log('Admin user created:', admin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
