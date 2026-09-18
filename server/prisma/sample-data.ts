// prisma/sample-data.ts
// Populates the database with a demo group and ~14 participants (each with a
// survey response) so you can see the group-admin analytics dashboard with real
// numbers. Safe to re-run — it upserts by email/name and only adds a response
// to a member who doesn't already have one.
//
// Run the base seed first (npm run db:seed), then:  npx tsx prisma/sample-data.ts
//
// Sign in afterwards as:  researcher@swswbs.local  /  Password123   (a Group Admin)

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set — check server/.env');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// numeric value (1..5) -> the AnswerScale enum the schema stores
const NUMBER_TO_SCALE = ['NONE_OF_THE_TIME', 'RARELY', 'SOME_OF_THE_TIME', 'OFTEN', 'ALL_OF_THE_TIME'] as const;
const scaleFor = (n: number) => NUMBER_TO_SCALE[Math.max(1, Math.min(5, n)) - 1];

const GENDERS = ['MALE', 'FEMALE', 'PREFER_NOT_TO_SAY', 'OTHERS'] as const;
const AGES = ['AGE_16_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_64', 'AGE_65_PLUS'] as const;

function surveyUsername(n: number) { return `SWSWBS${String(n).padStart(4, '0')}`; }

async function main() {
  // Baseline content must already exist (questions/options).
  const questions = await prisma.surveyQuestion.findMany({ where: { active: true }, orderBy: { order: 'asc' } });
  const sectors = await prisma.surveyOption.findMany({ where: { category: 'SECTOR', active: true }, orderBy: { order: 'asc' } });
  const educations = await prisma.surveyOption.findMany({ where: { category: 'EDUCATION', active: true }, orderBy: { order: 'asc' } });
  if (questions.length !== 14 || sectors.length === 0 || educations.length === 0) {
    throw new Error('Run `npm run db:seed` first — baseline questions/options are missing.');
  }

  const password = await bcrypt.hash('Password123', 12);

  // 1) A Group Admin (researcher) ---------------------------------------------
  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@swswbs.local' },
    update: { role: 'GROUP_ADMIN', emailVerified: true },
    create: {
      username: 'researcher', email: 'researcher@swswbs.local',
      passwordHash: password, role: 'GROUP_ADMIN', emailVerified: true,
      surveyUsername: 'PENDING',
    },
  });
  if (researcher.surveyUsername === 'PENDING') {
    await prisma.user.update({ where: { id: researcher.id }, data: { surveyUsername: surveyUsername(researcher.surveyNumber) } });
  }

  // 2) A demo group they administer -------------------------------------------
  const group = await prisma.group.upsert({
    where: { name: 'Demo Research Group' },
    update: {},
    create: {
      name: 'Demo Research Group',
      description: 'Sample group for trying out the analytics dashboard.',
      inviteCode: 'DEMO2026',
      creator: { connect: { id: researcher.id } },
      admins: { connect: { id: researcher.id } },
    },
  });

  // 3) ~14 participants, each with one survey response ------------------------
  // A spread of "well-being levels" so the distribution and stats are interesting.
  const levels = [5, 4, 4, 3, 3, 2, 5, 4, 4, 3, 3, 2, 4, 1]; // base answer per person
  let created = 0;

  for (let i = 0; i < levels.length; i++) {
    const n = i + 1;
    const email = `demo${n}@swswbs.local`;
    const member = await prisma.user.upsert({
      where: { email },
      update: { emailVerified: true, groupId: group.id },
      create: {
        username: `demo${n}`, email, passwordHash: password,
        role: 'NORMAL_USER', emailVerified: true, surveyUsername: 'PENDING',
        group: { connect: { id: group.id } },
      },
    });
    if (member.surveyUsername === 'PENDING') {
      await prisma.user.update({ where: { id: member.id }, data: { surveyUsername: surveyUsername(member.surveyNumber) } });
    }

    // Only add a response if this member has none yet (keeps re-runs clean).
    const existing = await prisma.surveyResponse.count({ where: { userId: member.id } });
    if (existing > 0) continue;

    const base = levels[i]!;
    // Vary each item a little around the person's base level (clamped 1..5).
    const answers = questions.map((q, idx) => {
      const jitter = ((idx * 7 + n * 3) % 3) - 1; // -1, 0, or +1, deterministic
      const value = Math.max(1, Math.min(5, base + jitter));
      return { questionId: q.id, value: scaleFor(value) as never, numericValue: value };
    });

    await prisma.surveyResponse.create({
      data: {
        userId: member.id, groupId: group.id, surveyUsername: member.surveyUsername === 'PENDING' ? surveyUsername(member.surveyNumber) : member.surveyUsername,
        gender: GENDERS[i % 3] as never,               // spread of Male/Female/PNTS
        ageGroup: AGES[i % AGES.length] as never,
        sectorId: sectors[i % sectors.length]!.id,
        educationId: educations[i % educations.length]!.id,
        designation: 'Participant', country: 'United Kingdom', state: 'Wales', city: 'Cardiff',
        consent: true,
        answers: { create: answers },
      },
    });
    created++;
  }

  console.log(`\nSample data ready:`);
  console.log(`  Group Admin : researcher@swswbs.local / Password123`);
  console.log(`  Group       : "Demo Research Group"  (invite code: DEMO2026)`);
  console.log(`  Participants: ${levels.length} members, ${created} new responses added`);
  console.log(`\nSign in as the researcher and open Analytics to see the dashboard.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
