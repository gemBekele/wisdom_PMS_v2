import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

const NEW_PASSWORD = '1234';

async function resetAllPasswords() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });

  const result = await prisma.user.updateMany({
    where: {},
    data: { password: hashedPassword },
  });

  console.log(`Password reset for ${result.count} users to: ${NEW_PASSWORD}`);
  console.table(users.map((u) => ({ email: u.email, name: u.name, role: u.role })));
}

resetAllPasswords()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());