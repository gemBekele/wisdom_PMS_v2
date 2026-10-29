import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'biruk.assefa@ghion.et';
const NEW_PASSWORD = 'admin123';

async function resetPassword() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

  const user = await prisma.user.update({
    where: { email: ADMIN_EMAIL },
    data: { password: hashedPassword },
  });

  console.log(`Password reset for ${user.email} (${user.name}) to: ${NEW_PASSWORD}`);
}

resetPassword()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
