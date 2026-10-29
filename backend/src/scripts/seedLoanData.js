import prisma from '../config/database.js';

const seedLoanData = async () => {
  try {
    console.log('Seeding loan test data...');

    // Get the branch and a staff user
    const branch = await prisma.branch.findFirst({ where: { code: 'WOLAYTA_SODO' } });
    if (!branch) {
      console.log('Branch WOLAYTA_SODO not found, skipping seed');
      return;
    }

    const staffUsers = await prisma.user.findMany({
      where: { branch_code: 'WOLAYTA_SODO', role: 'staff', isActive: true },
      take: 2,
    });

    if (staffUsers.length === 0) {
      console.log('No staff users found, skipping seed');
      return;
    }

    // Create test loan accounts if they don't exist
    const loanAccounts = [
      {
        accountNumber: 'LN-TEST-001',
        customerName: 'Test Loan Customer 1',
        accountType: 'Loan',
        balance: 50000,
        current_balance: 50000,
        active_status: true,
        status: 'Active',
        isProductive: true,
        payment_frequency: 'Monthly',
        loan_principal: 50000,
        loan_disbursement_date: new Date('2026-01-14'),
        loan_maturity_date: new Date('2027-01-14'),
        interest_rate: 12,
        next_payment_date: new Date('2026-07-14'),
      },
      {
        accountNumber: 'LN-TEST-002',
        customerName: 'Test Loan Customer 2',
        accountType: 'Loan',
        balance: 30000,
        current_balance: 30000,
        active_status: true,
        status: 'Active',
        isProductive: true,
        payment_frequency: 'Monthly',
        loan_principal: 30000,
        loan_disbursement_date: new Date('2026-03-01'),
        loan_maturity_date: new Date('2027-03-01'),
        interest_rate: 12,
        next_payment_date: new Date('2026-07-14'),
      },
    ];

    for (const acct of loanAccounts) {
      const existing = await prisma.accountMapping.findUnique({
        where: { accountNumber: acct.accountNumber },
      });

      if (!existing) {
        await prisma.accountMapping.create({
          data: {
            ...acct,
            mappedToId: staffUsers[0].id,
            branchId: branch.id,
          },
        });
        console.log(`Created loan account: ${acct.accountNumber}`);
      } else {
        console.log(`Loan account already exists: ${acct.accountNumber}`);
      }
    }

    // Generate loan schedules for the loan accounts
    const accounts = await prisma.accountMapping.findMany({
      where: {
        accountNumber: { in: ['LN-TEST-001', 'LN-TEST-002'] },
        accountType: 'Loan',
      },
    });

    for (const account of accounts) {
      const existingSchedules = await prisma.loanSchedule.count({
        where: { accountId: account.id },
      });

      if (existingSchedules === 0) {
        // Create some missed installments for LN-TEST-001 (overdue)
        if (account.accountNumber === 'LN-TEST-001') {
          const schedules = [];
          // Past due (missed)
          for (let i = 6; i >= 1; i--) {
            const dueDate = new Date(2026, 6 - i, 14);
            if (dueDate < new Date('2026-07-14')) {
              schedules.push({
                accountId: account.id,
                expectedDate: dueDate,
                expectedAmount: 4167,
                paidAmount: i === 1 ? 4167 : 0,
                status: i === 1 ? 'Paid' : 'Pending',
                daysPastDue: i === 1 ? 0 : Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
              });
            }
          }
          // Future (upcoming)
          for (let i = 0; i < 5; i++) {
            const dueDate = new Date(2026, 7 + i, 14);
            schedules.push({
              accountId: account.id,
              expectedDate: dueDate,
              expectedAmount: 4167,
              paidAmount: 0,
              status: 'Pending',
              daysPastDue: 0,
            });
          }
          await prisma.loanSchedule.createMany({ data: schedules });
          console.log(`Created ${schedules.length} schedules for ${account.accountNumber}`);
        } else {
          // LN-TEST-002: All paid up to date
          const schedules = [];
          for (let i = 4; i >= 1; i--) {
            const dueDate = new Date(2026, 3 + (4 - i), 14);
            if (dueDate <= new Date('2026-07-14')) {
              schedules.push({
                accountId: account.id,
                expectedDate: dueDate,
                expectedAmount: 2500,
                paidAmount: 2500,
                status: 'Paid',
                daysPastDue: 0,
              });
            }
          }
          // Future
          for (let i = 0; i < 7; i++) {
            const dueDate = new Date(2026, 8 + i, 1);
            schedules.push({
              accountId: account.id,
              expectedDate: dueDate,
              expectedAmount: 2500,
              paidAmount: 0,
              status: 'Pending',
              daysPastDue: 0,
            });
          }
          await prisma.loanSchedule.createMany({ data: schedules });
          console.log(`Created ${schedules.length} schedules for ${account.accountNumber}`);
        }
      } else {
        console.log(`Schedules already exist for ${account.accountNumber}`);
      }
    }

    console.log('Loan seed data created successfully!');
  } catch (error) {
    console.error('Error seeding loan data:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seedLoanData();
