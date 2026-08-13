import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const newHash = await bcrypt.hash('password123', 10);
  await prisma.user.update({
    where: { email: 'teacher@nexoralearning.com' },
    data: { passwordHash: newHash }
  });
  console.log("Teacher password successfully updated to a fresh hash of 'password123'.");
}

main().finally(() => prisma.$disconnect());
