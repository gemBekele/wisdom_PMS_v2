import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import { TASK_TYPE_TO_ENUM, MAPPING_STATUS_TO_ENUM, APPROVAL_STATUS_TO_ENUM, APPROVAL_STATUS_MAP } from '../utils/prismaHelpers.js';
import { notifyTaskApproval } from '../utils/notificationService.js';
import { BALANCE_SOURCE_KEY, BALANCE_SOURCE_DEFAULT } from './settingsController.js';

const TASK_TYPE_TO_CBS_PRODUCT = {
  'Loan_Saving_Deposit': 'LOAN SAVING RESERVE ACCOUNT',
  'Michu_Current_Saving': 'Michu Current Account',
  'Gihon_Regular_Saving': 'GIHON REGULAR SAVING',
  'Mothers_Saving': 'MOTHERS SAVING ACCOUNT',
  'Young_Womens_Saving': 'YOUNG WOMEN SAVING',
  'Elders_Saving': 'ELDERS SAVING ACCOUNT',
  'Children_Saving': 'CHILDREN SAVING ACCOUNT',
  'Fixed_Time_Deposit': 'FIXED TIME DEPOSIT',
  'Premium_Saving_Deposit': 'Premium Saving',
  'Special_Saving': 'SPECIAL SAVING ACCOUNT',
  'Segment_Deposit': 'Segment Account',
  'Wadiah_IFB_Deposit': 'WADIAH SAVING ACCOUNT',
};

// Helper: Build approval chain based on supervisor hierarchy
// Chain: Staff -> Supervisor (if exists) -> Branch Manager
// Internal Auditor (no supervisor) -> Branch Manager
const buildApprovalChain = async (submitter) => {
  const chain = [];
  const branch_code = submitter.branch_code;

  // Add supervisor as first approver if the submitter has one
  if (submitter.supervisorId) {
    const supervisor = await prisma.user.findUnique({
      where: { id: submitter.supervisorId }
    });
    if (supervisor) {
      chain.push({
        approverId: supervisor.id,
        role: 'supervisor',
        status: 'Pending',
      });
    }
  }

  // Add Branch Manager as final approver
  const branchManager = await prisma.user.findFirst({
    where: {
      branch_code,
      role: 'branchManager',
      isActive: true,
    }
  });
  if (branchManager) {
    chain.push({
      approverId: branchManager.id,
      role: 'Branch Manager',
      status: 'Pending',
    });
  }

  return chain;
};

// Helper: Check account mapping and June balance
const checkAccountMapping = async (accountNumber, userId, branch_code) => {
  const accountMapping = await prisma.accountMapping.findUnique({
    where: { accountNumber }
  });

  const juneBalance = await prisma.juneBalance.findFirst({
    where: {
      OR: [
        { account_id: accountNumber },
        { accountNumber: accountNumber },
      ],
      is_active: true,
    },
  });

  let mappingStatus;
  let canCountForKPI = false;

  if (!accountMapping) {
    mappingStatus = 'Unmapped';
    canCountForKPI = false;
  } else if (accountMapping.mappedToId === userId) {
    mappingStatus = 'Mapped to You';
    if (accountMapping.current_balance >= 1000) {
      canCountForKPI = true;
    }
  } else {
    mappingStatus = 'Mapped to Another Staff';
    canCountForKPI = false;
  }

  return {
    mappingStatus,
    canCountForKPI,
    accountMapping,
    juneBalance: juneBalance?.june_balance || 0,
  };
};

// @desc    Create daily task
// @route   POST /api/tasks
// @access  Private
export const createTask = asyncHandler(async (req, res) => {
  const { taskType, productType, accountNumber, customerName, accountType, amount, remarks, evidence, taskDate } = req.body;

  if (req.user.role !== 'staff' && req.user.role !== 'supervisor') {
    return res.status(403).json({
      success: false,
      message: `Your role '${req.user.role}' cannot log tasks`,
    });
  }

  let accountMappingId = null;
  let mappingStatus = 'Unmapped';
  let canCountForKPI = false;

  if (accountNumber) {
    const mappingCheck = await checkAccountMapping(
      accountNumber,
      req.user.id,
      req.user.branch_code
    );
    accountMappingId = mappingCheck.accountMapping?.id || null;
    mappingStatus = mappingCheck.mappingStatus;
    canCountForKPI = mappingCheck.canCountForKPI;
  }

  // If mapping doesn't exist AND we have a customer name, create it as Unmapped
  if (!accountMappingId && customerName) {
    const newMapping = await prisma.accountMapping.create({
      data: {
        accountNumber,
        customerName,
        accountType: accountType || 'Savings',
        status: 'Active',
        branchId: req.user.branchId,
        notes: 'Created during task entry',
        mappedToId: req.user.id,
        mappedById: req.user.id,
      }
    });
    accountMappingId = newMapping.id;
    mappingStatus = 'Unmapped';
  }

  const approvalChainData = await buildApprovalChain(req.user);

  const taskData = {
    taskType: TASK_TYPE_TO_ENUM[taskType] || taskType,
    accountNumber: accountNumber || `TASK-${Date.now()}`,
    accountId: accountMappingId,
    amount: amount || 0,
    submittedById: req.user.id,
    branchId: req.user.branchId,
    mappingStatus: MAPPING_STATUS_TO_ENUM[mappingStatus],
    taskDate: taskDate ? new Date(taskDate) : new Date(),
    approvalStatus: 'Pending',
  };
  if (productType) taskData.productType = productType;
  if (remarks) taskData.remarks = remarks;
  if (evidence) taskData.evidence = evidence;

  const task = await prisma.$transaction(async (tx) => {
    const newTask = await tx.dailyTask.create({ data: taskData });

    if (approvalChainData.length > 0) {
      await tx.taskApproval.createMany({
        data: approvalChainData.map(a => ({
          taskId: newTask.id,
          approverId: a.approverId,
          role: a.role,
          status: 'Pending',
        })),
      });
    }

    return newTask;
  });

  await logAudit(
    req.user.id,
    'Task Created',
    'Task',
    task.id,
    `Task ${taskType}`,
    `Created task for account ${accountNumber}`,
    req
  );

  res.status(201).json({
    success: true,
    data: { ...task, _id: task.id },
    mappingInfo: {
      status: mappingStatus,
      canCountForKPI: canCountForKPI,
    },
  });
});

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const { status, branchId, submittedBy, taskDate, approvalStatus } = req.query;

  const where = {};

  if (req.user.role === 'staff') {
    where.submittedById = req.user.id;
  } else if (req.user.role === 'branchManager') {
    where.branchId = req.user.branchId;
  } else if (req.user.role === 'areaManager') {
    const branches = await prisma.branch.findMany({ where: { areaId: req.user.areaId }, select: { id: true } });
    where.branchId = { in: branches.map(b => b.id) };
  } else if (req.user.role === 'supervisor') {
    const supervisedStaff = await prisma.user.findMany({
      where: { supervisorId: req.user.id, isActive: true },
      select: { id: true },
    });
    const staffIds = supervisedStaff.map(s => s.id);
    if (staffIds.length > 0) {
      where.submittedById = { in: staffIds };
    } else {
      where.submittedById = req.user.id;
    }
  } else if (req.user.branch_code) {
    const branch = await prisma.branch.findUnique({ where: { code: req.user.branch_code } });
    if (branch) where.branchId = branch.id;
  }

  if (status) where.mappingStatus = MAPPING_STATUS_TO_ENUM[status] || status;
  if (branchId) where.branchId = branchId;
  if (submittedBy) where.submittedById = submittedBy;
  if (approvalStatus) where.approvalStatus = APPROVAL_STATUS_TO_ENUM[approvalStatus] || approvalStatus;

  let isPendingApprovalByMe = false;
  if (req.query.pendingApprovalByMe === 'true') {
    isPendingApprovalByMe = true;
    where.approvalStatus = 'Pending';
    where.approvalChain = {
      some: {
        approverId: req.user.id,
        status: 'Pending'
      }
    };
  }

  if (req.query.hasEditRequest === 'true') {
    where.requestedEditAt = { not: null };
    if (req.user.role === 'staff') {
      where.submittedById = req.user.id;
    } else {
      where.approvalChain = {
        some: {
          approverId: req.user.id,
          status: 'Pending'
        }
      };
    }
  }

  if (taskDate) {
    const date = new Date(taskDate);
    where.taskDate = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lt: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  let tasks = await prisma.dailyTask.findMany({
    where,
    include: {
      submittedBy: { select: { id: true, name: true, employeeId: true, role: true, position: true } },
      branch: { select: { id: true, name: true, code: true } },
      account: { select: { id: true, accountNumber: true, customerName: true, product: true } },
      approvalChain: { include: { approver: { select: { id: true, name: true, position: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (isPendingApprovalByMe) {
    tasks = tasks.filter(t => {
      const chainOrdered = [...t.approvalChain].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const myIndex = chainOrdered.findIndex(a => a.approverId === req.user.id && a.status === 'Pending');
      if (myIndex === -1) return false;
      return chainOrdered.slice(0, myIndex).every(a => a.status === 'Approved');
    });
  }

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks.map(t => ({
      ...t,
      _id: t.id,
      submittedBy: { ...t.submittedBy, _id: t.submittedBy.id },
      branchId: { ...t.branch, _id: t.branch.id },
      accountId: t.account ? { ...t.account, _id: t.account.id } : null,
      approvalChain: t.approvalChain.map(a => ({
        ...a,
        _id: a.id,
        approverId: { ...a.approver, _id: a.approver.id }
      }))
    })),
  });
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = asyncHandler(async (req, res) => {
  const task = await prisma.dailyTask.findUnique({
    where: { id: req.params.id },
    include: {
      submittedBy: { select: { id: true, name: true, employeeId: true, role: true, position: true } },
      branch: { select: { id: true, name: true, code: true } },
      account: { select: { id: true, accountNumber: true, customerName: true } },
      approvalChain: { include: { approver: { select: { id: true, name: true, position: true } } } },
    },
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...task,
      _id: task.id,
      submittedBy: { ...task.submittedBy, _id: task.submittedBy.id },
      branchId: { ...task.branch, _id: task.branch.id },
      accountId: task.account ? { ...task.account, _id: task.account.id } : null,
      approvalChain: task.approvalChain.map(a => ({
        ...a,
        _id: a.id,
        approverId: { ...a.approver, _id: a.approver.id }
      }))
    },
  });
});

// @desc    Approve/Reject task
// @route   PUT /api/tasks/:id/approve
// @access  Private (Approvers)
export const approveTask = asyncHandler(async (req, res) => {
  const { status, comments } = req.body;
  const statusEnum = APPROVAL_STATUS_TO_ENUM[status] || status;

  const task = await prisma.dailyTask.findUnique({
    where: { id: req.params.id },
    include: { approvalChain: true }
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found',
    });
  }

  const chainOrdered = task.approvalChain.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const myApproval = chainOrdered.find(
    a => a.approverId === req.user.id && a.status === 'Pending'
  );

  if (!myApproval) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to approve this task',
    });
  }

  const myIndex = chainOrdered.indexOf(myApproval);
  const previousPending = chainOrdered.slice(0, myIndex).some(a => a.status !== 'Approved');
  if (previousPending) {
    return res.status(400).json({
      success: false,
      message: 'Earlier approvers in the chain have not approved yet. Please wait for your turn.',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskApproval.update({
      where: { id: myApproval.id },
      data: {
        status: statusEnum,
        approvedAt: new Date(),
        comments,
      }
    });

    const updatedChain = await tx.taskApproval.findMany({ where: { taskId: task.id } });

    const allApproved = updatedChain.every(a => a.status === 'Approved');
    const anyRejected = updatedChain.some(a => a.status === 'Rejected');

    let newTaskStatus = 'Pending';
    if (anyRejected) newTaskStatus = 'Rejected';
    else if (allApproved) newTaskStatus = 'Approved';

    await tx.dailyTask.update({
      where: { id: task.id },
      data: { approvalStatus: newTaskStatus }
    });

    // In APPROVAL balance-source mode, an approved deposit updates the
    // account's current_balance so KPI growth reflects it until CBS takes over.
    if (newTaskStatus === 'Approved') {
      const sourceSetting = await prisma.systemSetting.findUnique({
        where: { key: BALANCE_SOURCE_KEY },
      });
      const balanceSource = sourceSetting?.value || BALANCE_SOURCE_DEFAULT;

      if (balanceSource === 'approval' && !task.performanceImpacted && task.amount > 0) {
        const account = await tx.accountMapping.findUnique({
          where: { accountNumber: task.accountNumber },
        });

        if (account && account.accountType !== 'Loan') {
          const cbsProduct = TASK_TYPE_TO_CBS_PRODUCT[task.taskType];

          await tx.accountMapping.update({
            where: { id: account.id },
            data: {
              current_balance: (account.current_balance || 0) + task.amount,
              ...(cbsProduct && !account.product ? { product: cbsProduct } : {}),
            },
          });

          await tx.dailyTask.update({
            where: { id: task.id },
            data: { performanceImpacted: true, performanceImpactedAt: new Date() },
          });
        }
      }
    }
  });

  await logAudit(
    req.user.id,
    status === 'Approved' ? 'Task Approved' : 'Task Rejected',
    'Task',
    task.id,
    `Task ${task.taskType}`,
    `${status} task with comments: ${comments || 'No comments'}`,
    req
  );

  const finalTask = await prisma.dailyTask.findUnique({
    where: { id: req.params.id },
    include: { approvalChain: true }
  });

  // Notify submitter
  notifyTaskApproval({
    userId: task.submittedById,
    accountNumber: task.accountNumber,
    amount: task.amount,
    status,
    comments,
    approverName: req.user.name,
  }).catch(() => {});

  res.status(200).json({
    success: true,
    data: { ...finalTask, _id: finalTask.id },
  });
});

// @desc    Request edit on a task (by submitter)
// @route   PUT /api/tasks/:id/request-edit
// @access  Private (Staff/Supervisor - task owner only)
export const requestTaskEdit = asyncHandler(async (req, res) => {
  const { taskType, productType, accountNumber, amount, remarks } = req.body;

  const task = await prisma.dailyTask.findUnique({
    where: { id: req.params.id }
  });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  if (task.submittedById !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only request edits on your own tasks' });
  }

  if (task.approvalStatus === 'Approved' || task.approvalStatus === 'Rejected') {
    return res.status(400).json({
      success: false,
      message: `Cannot request edit on a ${task.approvalStatus.toLowerCase()} task`
    });
  }

  const editData = {};
  if (taskType !== undefined) editData.taskType = taskType;
  if (productType !== undefined) editData.productType = productType;
  if (accountNumber !== undefined) editData.accountNumber = accountNumber;
  if (amount !== undefined) editData.amount = amount;
  if (remarks !== undefined) editData.remarks = remarks;

  if (Object.keys(editData).length === 0) {
    return res.status(400).json({ success: false, message: 'No changes provided' });
  }

  await prisma.dailyTask.update({
    where: { id: task.id },
    data: {
      requestedEditData: editData,
      requestedEditAt: new Date(),
    }
  });

  await logAudit(
    req.user.id,
    'Edit Requested',
    'Task',
    task.id,
    `Task ${task.taskType}`,
    `Requested edit: ${JSON.stringify(editData)}`,
    req
  );

  res.status(200).json({ success: true, message: 'Edit request submitted for review' });
});

// @desc    Review (approve/reject) task edit request
// @route   PUT /api/tasks/:id/review-edit
// @access  Private (Supervisor/Branch Manager)
export const reviewTaskEdit = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'

  const task = await prisma.dailyTask.findUnique({
    where: { id: req.params.id },
    include: { approvalChain: true }
  });

  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  if (!task.requestedEditData) {
    return res.status(400).json({ success: false, message: 'No pending edit request on this task' });
  }

  const isApprover = task.approvalChain?.some(
    a => a.approverId === req.user.id && a.status === 'Pending'
  );
  const isManagerOrAdmin = ['admin', 'branchManager', 'areaManager'].includes(req.user.role);

  if (!isApprover && !isManagerOrAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized to review edit requests' });
  }

  if (action === 'approve') {
    const editData = task.requestedEditData;

    const updateData = {};
    if (editData.taskType) updateData.taskType = editData.taskType;
    if (editData.productType !== undefined) updateData.productType = editData.productType;
    if (editData.accountNumber) updateData.accountNumber = editData.accountNumber;
    if (editData.amount !== undefined) updateData.amount = editData.amount;
    if (editData.remarks !== undefined) updateData.remarks = editData.remarks;
    updateData.requestedEditData = null;
    updateData.requestedEditAt = null;

    await prisma.dailyTask.update({
      where: { id: task.id },
      data: updateData,
    });

    await logAudit(
      req.user.id,
      'Edit Approved',
      'Task',
      task.id,
      `Task ${task.taskType}`,
      `Approved edit: ${JSON.stringify(editData)}`,
      req
    );

    res.status(200).json({ success: true, message: 'Edit request approved' });
  } else if (action === 'reject') {
    await prisma.dailyTask.update({
      where: { id: task.id },
      data: {
        requestedEditData: null,
        requestedEditAt: null,
      }
    });

    await logAudit(
      req.user.id,
      'Edit Rejected',
      'Task',
      task.id,
      `Task ${task.taskType}`,
      'Rejected edit request',
      req
    );

    res.status(200).json({ success: true, message: 'Edit request rejected' });
  } else {
    res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
  }
});
