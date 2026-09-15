// prisma/seed.ts
// Fills the empty database with baseline data: the 14 survey questions,
// the sector/education option lists, and a first admin user.
// Run with: npm run db:seed

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

// Prisma 7 connects through a driver adapter. Build the pg adapter from
// DATABASE_URL, then hand it to the client.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — check server/.env');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---- Baseline content (from the original survey) ----
const QUESTIONS: string[] = [
  'I’ve been living in a safe and healthy home environment',
  'I’ve been able to enjoy a safe and healthy environment outside my home',
  'I’ve been financially secure and so have had enough income to meet my needs',
  'I’ve been doing worthwhile activities (paid/unpaid) when I’ve wanted',
  'I’ve been able to carry out what I’ve set out to do when I’ve wanted',
  'I’ve met up with family and friends and we have done things together when I’ve wanted',
  "I've been free from harassment and discrimination",
  'I’ve been able to use local services and facilities when I’ve needed',
  'I’ve felt useful when I help and support other people',
  'I’ve had my opinions taken seriously',
  'I’ve interacted with others in person when I’ve wanted',
  'I’ve interacted with others digitally, online and/or using a phone when I’ve wanted',
  "I've been involved with community groups and/or activities when I’ve wanted",
  'I’ve learnt about the world',
];

const SECTORS: string[] = [
  'Agriculture, Forestry, and Fishing',
  'Mining and Quarrying',
  'Construction',
  'Manufacturing',
  'Utilities (Electricity, Gas, Water)',
  'Transportation and Warehousing',
  'Information Technology and Telecommunications',
  'Finance and Insurance',
  'Real Estate and Rental',
  'Professional, Scientific, and Technical Services',
  'Management and Consulting Services',
  'Education',
  'Healthcare and Social Assistance',
  'Arts, Entertainment, and Recreation',
  'Accommodation and Food Services',
  'Retail Trade',
  'Wholesale Trade',
  'Public Administration and Government',
  'Other Services (e.g., Personal Care, Repair)',
  'Nonprofit Organizations',
];

const EDUCATION_LEVELS: string[] = [
  'No Formal Education',
  'Primary School',
  'Middle School',
  'Some High School, No Diploma',
  'High School',
  'GED',
  'Vocational/Technical School',
  'Some College, No Degree',
  "Associate's Degree",
  "Bachelor's Degree",
  'Professional Certification',
  'Postgraduate Diploma/Certificate',
  "Master's Degree",
  'Doctorate',
  'Doctor of Medicine (MD) or Equivalent',
  'Juris Doctor (JD)',
  'Postdoctoral Studies',
];

// Build "SWSWBS0001" from the numeric survey number.
function formatSurveyUsername(n: number): string {
  return `SWSWBS${String(n).padStart(4, '0')}`;
}

async function main() {
  console.log('Seeding database...');

  // 1) Questions — keyed by `order`, so re-running updates instead of duplicating.
  for (let i = 0; i < QUESTIONS.length; i++) {
    const order = i + 1;
    await prisma.surveyQuestion.upsert({
      where: { order },
      update: { text: QUESTIONS[i]!, active: true },
      create: { order, text: QUESTIONS[i]!, active: true },
    });
  }
  console.log(`  ${QUESTIONS.length} questions`);

  // 2) Sector options — keyed by the unique [category, label] pair.
  for (let i = 0; i < SECTORS.length; i++) {
    await prisma.surveyOption.upsert({
      where: { category_label: { category: 'SECTOR', label: SECTORS[i]! } },
      update: { order: i + 1, active: true },
      create: { category: 'SECTOR', label: SECTORS[i]!, order: i + 1 },
    });
  }
  console.log(`  ${SECTORS.length} sectors`);

  // 3) Education options.
  for (let i = 0; i < EDUCATION_LEVELS.length; i++) {
    await prisma.surveyOption.upsert({
      where: { category_label: { category: 'EDUCATION', label: EDUCATION_LEVELS[i]! } },
      update: { order: i + 1, active: true },
      create: { category: 'EDUCATION', label: EDUCATION_LEVELS[i]!, order: i + 1 },
    });
  }
  console.log(`  ${EDUCATION_LEVELS.length} education levels`);

  // 4) First admin user.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@swswbs.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    // surveyNumber is assigned by the DB, so we create first, then build the
    // "SWSWBS0001" handle from it and update.
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        surveyUsername: 'PENDING',
      },
    });
    await prisma.user.update({
      where: { id: admin.id },
      data: { surveyUsername: formatSurveyUsername(admin.surveyNumber) },
    });
    console.log(`  admin created: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`  admin already exists: ${adminEmail}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });