import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                employeeId: true,
                name: true,
                email: true,
                role: true,
                branch_code: true,
                isActive: true,
            },
        });

        console.log('--- USER LIST ---');
        console.table(users);

        // Also include branch managers specifically as requested
        const branchManagers = users.filter(u => u.role === 'branchManager');
        console.log('\n--- BRANCH MANAGERS ---');
        console.table(branchManagers);

        console.log('\nNOTE: Passwords are hashed in the database and cannot be retrieved in plain text.');
        console.log('Refer to the seed script (src/scripts/seedAllUsers.js) for default testing passwords:');
        console.log('- admin@sako.com | admin123');
        console.log('- regional@sako.com | regional123');
        console.log('- areamanager@sako.com | area123');
        console.log('- branchmanager@sako.com | branch123');
        console.log('- linemanager@sako.com | line123');
        console.log('- subteam@sako.com | subteam123');
        console.log('- staff@sako.com | staff123');

    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
