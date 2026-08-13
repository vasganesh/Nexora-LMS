import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'teacher@nexoralearning.com' }
  });
  if (user) {
    console.log("Database user found.");
    console.log("Email:", user.email);
    console.log("Hash in DB:", user.passwordHash);
    
    const candidates = ['password123', 'password', 'admin123', 'admin', '12345'];
    for (const cand of candidates) {
      const isMatch = bcrypt.compareSync(cand, user.passwordHash);
      console.log(`Checking match for "${cand}":`, isMatch);
    }
  } else {
    console.log("User not found!");
  }
}

main().finally(() => prisma.$disconnect());
