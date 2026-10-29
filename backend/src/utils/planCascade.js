import prisma from '../config/database.js';
import { normalizePeriod } from './periodUtils.js';
import { PRODUCT_CATEGORY_TO_KPI } from './prismaHelpers.js';

const DEPOSIT_PRODUCT_SHARES = {
  operationSupervisor: 35,
  crSupervisor: 25,
  crOfficer: 15,
  csOfficer: 25,
};

const POSITION_GROUP = {
  'Branch Manager':                    'branchManager',
  'Operation Supervisor':              'operationSupervisor',
  'Customer Relationship Supervisor':  'crSupervisor',
  'Customer Relationship Officer I':   'crOfficer',
  'Customer Service Officer I':        'csOfficer',
  'Customer Service Officer II':       'csOfficer',
  'Sales & Marketing Officer I':       'crOfficer',
  'Internal Auditor':                  null,
};

const calculateBreakdowns = (target, period) => {
  const p = period || '';
  let monthly = 0;
  let weekly = 0;
  let daily = 0;

  if (/^FY-\d{4}/.test(p) || p.includes('Year') || p.includes('year')) {
    monthly = target / 12;
    weekly = target / 52;
    daily = target / 365;
  } else if (p.includes('H2') || p.includes('H1')) {
    monthly = target / 6;
    weekly = target / 26;
    daily = target / 183;
  } else if (p.includes('Q4') || p.includes('Q')) {
    monthly = target / 3;
    weekly = target / 13;
    daily = target / 92;
  } else if (p.toLowerCase().includes('month')) {
    monthly = target;
    weekly = target / 4;
    daily = target / 30;
  } else {
    monthly = target / 12;
    weekly = target / 52;
    daily = target / 365;
  }

  return {
    yearly: Math.round(target * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    weekly: Math.round(weekly * 100) / 100,
    daily: Math.round(daily * 100) / 100,
  };
};

export const cascadePlanToStaff = async (branchPlan) => {
  try {
    const { branch_code, kpi_category, product_category, target_value, target_count, target_type, id: branchPlanId, branchId } = branchPlan;
    const period = normalizePeriod(branchPlan.period);

    // Use deposit product shares for all product plans and deposit KPIs
    // Use same shares as default for credit KPIs too (Phase 3 may override)
    const shares = { ...DEPOSIT_PRODUCT_SHARES };

    const allStaff = await prisma.user.findMany({
      where: { branch_code, isActive: true, role: { in: ['staff', 'supervisor'] } },
    });

    const grouped = {};
    for (const s of allStaff) {
      const normalizedPosition = s.position.replace(/_/g, ' ');
      const group = POSITION_GROUP[normalizedPosition];
      if (!group || group === 'branchManager') continue;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(s);
    }

    // Option A: Redistribute empty-group shares to present groups
    const presentGroups = Object.entries(grouped).filter(([, members]) => members.length > 0);
    const totalPresentShare = presentGroups.reduce((sum, [g]) => sum + (shares[g] || 0), 0);
    if (totalPresentShare === 0) throw new Error('No staff groups with valid shares found in branch');

    const staffPlansCreated = [];
    const effectiveKpi = product_category ? (PRODUCT_CATEGORY_TO_KPI[product_category] || kpi_category) : kpi_category;

    for (const [group, members] of presentGroups) {
      const matrixShare = shares[group] || 0;
      // Redistribute: effective = matrixShare / totalPresentShare * 100
      const effectiveGroupPercent = (matrixShare / totalPresentShare) * 100;
      const groupTarget = (target_value * effectiveGroupPercent) / 100;
      const perPerson = groupTarget / members.length;
      const perPersonCount = target_count ? (target_count * effectiveGroupPercent) / 100 / members.length : 0;

      for (const member of members) {
        const breakdowns = calculateBreakdowns(perPerson, period);
        const staffPlan = await prisma.staffPlan.create({
          data: {
            branchPlanId,
            branch_code,
            branchId,
            userId: member.id,
            position: member.position,
            kpi_category: effectiveKpi,
            product_category: product_category || null,
            period,
            target_type,
            individual_target: perPerson,
            target_count: perPersonCount,
            yearly_target: breakdowns.yearly,
            monthly_target: breakdowns.monthly,
            weekly_target: breakdowns.weekly,
            daily_target: breakdowns.daily,
            plan_share_percent: effectiveGroupPercent / members.length,
            status: 'Active',
          },
        });
        staffPlansCreated.push(staffPlan);
      }
    }

    return staffPlansCreated;
  } catch (error) {
    throw new Error(`Plan cascade to staff error: ${error.message}`);
  }
};

export const cascadeBranchPlan = async (branchPlan) => {
  try {
    await prisma.staffPlan.deleteMany({ where: { branchPlanId: branchPlan.id } });
    const staffPlans = await cascadePlanToStaff(branchPlan);
    return {
      success: true,
      message: `Plan cascaded to ${staffPlans.length} staff members`,
      staffPlansCount: staffPlans.length,
    };
  } catch (error) {
    throw new Error(`Branch plan cascade error: ${error.message}`);
  }
};
