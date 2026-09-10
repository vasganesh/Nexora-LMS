import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const cohortStudents = [
  {
    firstName: "Prathamesh",
    lastName: "Sharma",
    name: "Prathamesh Sharma",
    email: "prathamesh@nexoralearning.in",
    username: "prathamesh.sharma",
    age: "17",
    location: "Chennai",
    className: "Class 12",
    classId: "cfd73df5-735c-40d7-bf10-a97b91e14f74",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Ananya",
    lastName: "Iyer",
    name: "Ananya Iyer",
    email: "ananya.iyer@gmail.com",
    username: "ananya.iyer",
    age: "17",
    location: "Coimbatore",
    className: "Class 12",
    classId: "cfd73df5-735c-40d7-bf10-a97b91e14f74",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Karthik",
    lastName: "Subramanian",
    name: "Karthik Subramanian",
    email: "karthik.s@gmail.com",
    username: "karthik.s",
    age: "17",
    location: "Madurai",
    className: "Class 12",
    classId: "cfd73df5-735c-40d7-bf10-a97b91e14f74",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Deepika",
    lastName: "Raman",
    name: "Deepika Raman",
    email: "deepika.r@gmail.com",
    username: "deepika.r",
    age: "16",
    location: "Trichy",
    className: "Class 11",
    classId: "e62fca94-4c67-4c51-8ac7-f651049beeef",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Vignesh",
    lastName: "Kumar",
    name: "Vignesh Kumar",
    email: "vignesh.k@gmail.com",
    username: "vignesh.k",
    age: "17",
    location: "Salem",
    className: "Class 12",
    classId: "cfd73df5-735c-40d7-bf10-a97b91e14f74",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Meera",
    lastName: "Krishnan",
    name: "Meera Krishnan",
    email: "meera.k@gmail.com",
    username: "meera.k",
    age: "16",
    location: "Chennai",
    className: "Class 11",
    classId: "e62fca94-4c67-4c51-8ac7-f651049beeef",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Rahul",
    lastName: "Verma",
    name: "Rahul Verma",
    email: "rahul.v@gmail.com",
    username: "rahul.v",
    age: "15",
    location: "Coimbatore",
    className: "Class 10",
    classId: "5d5f797f-173d-4c1f-8c81-7f8008a513da",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Sanjay",
    lastName: "Swaminathan",
    name: "Sanjay Swaminathan",
    email: "sanjay.s@gmail.com",
    username: "sanjay.s",
    age: "17",
    location: "Thanjavur",
    className: "Class 12",
    classId: "cfd73df5-735c-40d7-bf10-a97b91e14f74",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  },
  {
    firstName: "Pooja",
    lastName: "Sundaram",
    name: "Pooja Sundaram",
    email: "pooja.s@gmail.com",
    username: "pooja.s",
    age: "15",
    location: "Madurai",
    className: "Class 10",
    classId: "5d5f797f-173d-4c1f-8c81-7f8008a513da",
    boardId: "bf9354d8-2152-48ef-8720-723451951486",
    boardTitle: "Tamil Nadu State Board",
    status: "APPROVED"
  }
];

async function seedCohort() {
  console.log('Seeding real cohort students into PostgreSQL & registration store...');
  const passwordHash = await bcrypt.hash('Nexora@2026', 10);

  const studentRole = await prisma.role.findFirst({ where: { name: 'STUDENT' } });

  for (const s of cohortStudents) {
    const emailLower = s.email.toLowerCase();
    let dbUser = await prisma.user.findUnique({ where: { email: emailLower } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: emailLower,
          passwordHash,
          firstName: s.firstName,
          lastName: s.lastName,
          role: UserRole.STUDENT,
          studentProfile: {
            create: {
              boardId: s.boardId,
              classId: s.classId,
              analytics: { create: { xp: 150 } },
              learningStreak: { create: { currentStreak: 3, longestStreak: 7 } },
            }
          }
        }
      });
      console.log(`Created DB user: ${s.name} (${emailLower})`);

      if (studentRole) {
        await prisma.userRoleJoin.create({
          data: {
            userId: dbUser.id,
            roleId: studentRole.id
          }
        }).catch(() => {});
      }
    } else {
      console.log(`DB user already exists: ${s.name} (${emailLower})`);
    }
  }

  // Update registration_requests.json
  const dataDir = path.join(process.cwd(), 'server', 'data');
  const dataFile = path.join(dataDir, 'registration_requests.json');
  let requests = [];
  if (fs.existsSync(dataFile)) {
    try {
      requests = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } catch {}
  }

  for (const s of cohortStudents) {
    const emailLower = s.email.toLowerCase();
    const existing = requests.find((r) => r.email.toLowerCase() === emailLower);
    if (!existing) {
      requests.push({
        id: `req-cohort-${emailLower.replace(/[^a-z0-9]/g, '-')}`,
        name: s.name,
        firstName: s.firstName,
        lastName: s.lastName,
        email: emailLower,
        age: s.age,
        location: s.location,
        boardId: s.boardId,
        boardTitle: s.boardTitle,
        classId: s.classId,
        classTitle: s.className,
        optedSubjectId: "",
        status: s.status,
        createdAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        username: s.username,
        generatedPassword: "Nexora@2026"
      });
      console.log(`Added ${s.name} to registration_requests.json`);
    }
  }

  fs.writeFileSync(dataFile, JSON.stringify(requests, null, 2), 'utf-8');
  console.log('Finished updating registration requests and database.');
}

seedCohort()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
