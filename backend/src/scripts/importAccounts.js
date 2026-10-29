import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../../Accounts.csv');

const CATEGORY_TO_ACCOUNT_TYPE = {
  'Michu Current Account': 'Current',
  'LOAN SAVING RESERVE ACCOUNT': 'Savings',
  'GIHON REGULAR SAVING': 'Savings',
  'WADIAH SAVING ACCOUNT': 'Savings',
  'SPECIAL SAVING ACCOUNT': 'Savings',
  'REPAYMENT ACCOUNT': 'Loan',
  'CHILDREN SAVING ACCOUNT': 'Savings',
  'MOTHERS SAVING ACCOUNT': 'Savings',
  'YOUNG WOMEN SAVING': 'Savings',
  'ELDERS SAVING ACCOUNT': 'Savings',
  'FIXED TIME DEPOSIT': 'Fixed_Deposit',
};

function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  let started = false;
  for (const raw of lines) {
    const line = raw.trim().replace(/\r$/, '');
    if (!line || !started) {
      if (line.startsWith('Account Name,')) started = true;
      continue;
    }
    const fields = splitCSVLine(line);
    if (fields.length < 14) continue;
    result.push(fields);
  }
  return result;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const sciCounters = {};

function makeAccountNumber(raw, customerNo) {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned.includes('E')) {
    const custNum = customerNo.replace(/[,\s]/g, '');
    const key = `E-${custNum}`;
    if (!sciCounters[key]) sciCounters[key] = 0;
    sciCounters[key]++;
    const suffix = sciCounters[key];
    return `CSV-${custNum}-${suffix}`;
  }
  return cleaned;
}

async function main() {
  console.log('Importing accounts from CSV...\n');

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length} account rows from CSV\n`);

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('No admin user found');
  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branch found');

  const allUsers = await prisma.user.findMany({ where: { OR: [{ role: 'staff' }, { role: 'supervisor' }] } });

  const records = [];

  for (const fields of rows) {
    const customerName = fields[0];
    const customerNo = fields[1];
    const category = fields[3];
    const rawAccountNumber = fields[4];
    const rawBalance = fields[9];

    const accountNumber = makeAccountNumber(rawAccountNumber, customerNo);
    const balance = parseFloat(rawBalance.replace(/,/g, '')) || 0;
    const accountType = CATEGORY_TO_ACCOUNT_TYPE[category] || 'Savings';
    const product = category;
    const isProductive = balance >= 1000;

    records.push({ accountNumber, customerName, accountType, balance, product, isProductive });
  }

  const allMappable = allUsers.filter(u => u.role === 'staff' || u.role === 'supervisor');
  console.log(`Distributing ${records.length} accounts evenly across ${allMappable.length} users (~${Math.round(records.length / allMappable.length)} each)...`);

  for (let i = 0; i < records.length; i++) {
    const u = allMappable[i % allMappable.length];
    records[i].mappedToId = u.id;
    records[i].mappedToName = u.name;
  }

  console.log('Deleting existing account mappings and june balances...');
  await prisma.juneBalance.deleteMany();
  await prisma.accountMapping.deleteMany();
  console.log('Cleared existing data.\n');

  let created = 0;
  const batchSize = 200;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const data = batch.map(r => ({
      accountNumber: r.accountNumber,
      customerName: r.customerName,
      accountType: r.accountType,
      balance: r.balance,
      current_balance: r.balance,
      june_balance: 0,
      active_status: true,
      isProductive: r.isProductive,
      product: r.product,
      status: 'Active',
      mappedToId: r.mappedToId,
      mappedById: admin.id,
      branchId: branch.id,
    }));

    await prisma.accountMapping.createMany({ data });
    created += batch.length;
    console.log(`  Created ${created}/${records.length} account mappings...`);
  }

  console.log(`\n✅ Created ${created} account mappings`);

  console.log('Creating June balance records...');
  const juneBatchSize = 500;

  for (let i = 0; i < records.length; i += juneBatchSize) {
    const batch = records.slice(i, i + juneBatchSize);
    const juneData = batch.map(r => ({
      account_id: r.accountNumber,
      accountNumber: r.accountNumber,
      june_balance: 0,
      branch_code: 'WOLAYTA_SODO',
      baseline_period: '2025',
      baseline_date: new Date('2025-06-30'),
      is_active: true,
      importedById: admin.id,
    }));
    await prisma.juneBalance.createMany({ data: juneData });
  }

  console.log(`✅ Created ${records.length} June balance records\n`);

  const perUser = {};
  for (const r of records) {
    const name = r.mappedToName || 'unknown';
    perUser[name] = (perUser[name] || 0) + 1;
  }

  console.log('Accounts per user:');
  const sorted = Object.entries(perUser).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`  ${String(count).padStart(4)}  ${name}`);
  }

  console.log(`\nDone! Total: ${records.length} accounts imported.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
