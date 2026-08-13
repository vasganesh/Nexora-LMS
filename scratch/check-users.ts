import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'teacher@nexoralearning.com' }
  });
  if (user) {
    const isMatch = bcrypt.compareSync('password123', user.passwordHash);
    console.log("Password matches 'password123'?:", isMatch);
    console.log("Hash is:", user.passwordHash);
  } else {
    console.log("User not found!");
  }
}

main().finally(() => prisma.$disconnect());
