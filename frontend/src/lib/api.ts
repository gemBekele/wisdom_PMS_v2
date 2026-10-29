const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth token
export const getToken = () => {
  return sessionStorage.getItem('token');
};

// Helper function to set auth token
export const setToken = (token: string) => {
  sessionStorage.setItem('token', token);
};

// Helper function to remove auth token
export const removeToken = () => {
  sessionStorage.removeItem('token');
};

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  getMe: async () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },
  login: async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },
  
  register: async (userData: any) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  
  updateDetails: async (details: any) => {
    return apiRequest('/auth/updatedetails', {
      method: 'PUT',
      body: JSON.stringify(details),
    });
  },
  
  updatePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/auth/updatepassword', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getUsersList: async () => {
    return apiRequest('/auth/users-list', {
      method: 'GET',
    });
  },
};


// Users API
export const usersAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/users${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/users/${id}`);
  },
  
  create: async (userData: any) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  update: async (id: string, userData: any) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  resetPassword: async (id: string, newPassword: string) => {
    return apiRequest(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  getHierarchy: async () => {
    return apiRequest('/users/hierarchy', {
      method: 'GET',
    });
  },
};

// Plans API
export const plansAPI = {
  getAchievement: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/plans/achievement${queryString}`);
  },
  create: async (planData: any) => {
    return apiRequest('/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  },
  
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('planFile', file);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/plans/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },
  
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/plans${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/plans/${id}`);
  },
  
  update: async (id: string, planData: any) => {
    return apiRequest(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  },
};

// Staff Plans API
export const staffPlansAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/staff-plans${queryString}`);
  },
  
  getByUser: async (userId: string, period: string) => {
    return apiRequest(`/staff-plans?userId=${userId}&period=${period}`);
  },
};

// Tasks API
export const tasksAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/tasks${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/tasks/${id}`);
  },
  
  create: async (taskData: any) => {
    return apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },
  
  approve: async (id: string, status: string, comments?: string) => {
    return apiRequest(`/tasks/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ status, comments }),
    });
  },

  requestEdit: async (id: string, editData: any) => {
    return apiRequest(`/tasks/${id}/request-edit`, {
      method: 'PUT',
      body: JSON.stringify(editData),
    });
  },

  reviewEdit: async (id: string, action: 'approve' | 'reject') => {
    return apiRequest(`/tasks/${id}/review-edit`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  },
};

// Mappings API
export const mappingsAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/mappings${queryString}`);
  },
  
  create: async (mappingData: any) => {
    return apiRequest('/mappings', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  },
  
  update: async (id: string, mappingData: any) => {
    return apiRequest(`/mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mappingData),
    });
  },
  
  autoBalance: async (branchId: string) => {
    return apiRequest('/mappings/auto-balance', {
      method: 'POST',
      body: JSON.stringify({ branchId }),
    });
  },
  
  bulkUpload: async (file: File, branchId: string) => {
    const formData = new FormData();
    formData.append('mappingFile', file);
    formData.append('branchId', branchId);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/mappings/bulk-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },
};

// Performance API
export const performanceAPI = {
  calculate: async (userId: string, period: string) => {
    return apiRequest('/performance/calculate', {
      method: 'POST',
      body: JSON.stringify({ userId, period }),
    });
  },
  
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/performance${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/performance/${id}`);
  },
};

// Behavioral API
export const behavioralAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/behavioral${queryString}`);
  },
  
  create: async (evaluationData: any) => {
    return apiRequest('/behavioral', {
      method: 'POST',
      body: JSON.stringify(evaluationData),
    });
  },
  
  approve: async (id: string, status: string, comments?: string) => {
    return apiRequest(`/behavioral/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ status, comments }),
    });
  },
};

// CBS API
export const cbsAPI = {
  upload: async (file: File, branch_code: string, validationDate: string) => {
    const formData = new FormData();
    formData.append('cbsFile', file);
    formData.append('branch_code', branch_code);
    formData.append('validationDate', validationDate);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/cbs/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },
  
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/cbs${queryString}`);
  },
  
  resolveDiscrepancy: async (validationId: string, discrepancyId: string, notes: string) => {
    return apiRequest(`/cbs/${validationId}/resolve/${discrepancyId}`, {
      method: 'PUT',
      body: JSON.stringify({ resolutionNotes: notes }),
    });
  },
};

// June Balance API
export const juneBalanceAPI = {
  import: async (file: File, baseline_period: string, baseline_date: string, make_active: boolean = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('baseline_period', baseline_period);
    formData.append('baseline_date', baseline_date);
    formData.append('make_active', make_active.toString());

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/june-balance/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || 'Import failed');
    }

    return response.json();
  },
  
  getPeriods: async () => {
    return apiRequest('/june-balance/periods/list');
  },
  
  activatePeriod: async (period: string) => {
    return apiRequest(`/june-balance/periods/${period}/activate`, {
      method: 'PUT',
    });
  },
  
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/june-balance${queryString}`);
  },
  
  getByAccount: async (accountId: string) => {
    return apiRequest(`/june-balance/${accountId}`);
  },
};

// Product KPI Mapping API
export const productMappingAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/product-mappings${queryString}`);
  },
  
  getUnmapped: async () => {
    return apiRequest('/product-mappings/unmapped');
  },
  
  create: async (mappingData: any) => {
    return apiRequest('/product-mappings', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  },
  
  bulkCreate: async (mappings: any[]) => {
    return apiRequest('/product-mappings/bulk', {
      method: 'POST',
      body: JSON.stringify({ mappings }),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/product-mappings/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getHQ: async (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`/dashboard/hq${qs}`);
  },
  getArea: async (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`/dashboard/area${qs}`);
  },
  getBranch: async (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`/dashboard/branch${qs}`);
  },
  getSupervisor: async () => {
    return apiRequest('/dashboard/supervisor');
  },
  getBranchOperations: async (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return apiRequest(`/dashboard/branch-operations${qs}`);
  },
  getMyBranchOperations: async (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return apiRequest(`/dashboard/branch-operations/me${qs}`);
  },
  getStaff: async () => {
    return apiRequest('/dashboard/staff');
  },
};

// Audit API
export const auditAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/audit${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/audit/${id}`);
  },
};

// Branches API
export const branchesAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/branches${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/branches/${id}`);
  },
  
  create: async (branchData: any) => {
    return apiRequest('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  },
  
  update: async (id: string, branchData: any) => {
    return apiRequest(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/branches/${id}`, {
      method: 'DELETE',
    });
  },
};

// Regions API
export const regionsAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/regions${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/regions/${id}`);
  },
  
  create: async (regionData: any) => {
    return apiRequest('/regions', {
      method: 'POST',
      body: JSON.stringify(regionData),
    });
  },
  
  update: async (id: string, regionData: any) => {
    return apiRequest(`/regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(regionData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/regions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Areas API
export const areasAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/areas${queryString}`);
  },
  
  getById: async (id: string) => {
    return apiRequest(`/areas/${id}`);
  },
  
  create: async (areaData: any) => {
    return apiRequest('/areas', {
      method: 'POST',
      body: JSON.stringify(areaData),
    });
  },
  
  update: async (id: string, areaData: any) => {
    return apiRequest(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(areaData),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest(`/areas/${id}`, {
      method: 'DELETE',
    });
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/transactions${queryString}`);
  },

  create: async (data: any) => {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTodayTotal: async (branch_code?: string) => {
    const queryString = branch_code ? `?branch_code=${branch_code}` : '';
    return apiRequest(`/transactions/today${queryString}`);
  },
};

export const mappedAccountsAPI = {
  getDashboard: async (userId?: string) => {
    const qs = userId ? `?userId=${userId}` : '';
    return apiRequest(`/mapped-accounts/dashboard${qs}`);
  },
  getBranchAccounts: async () => {
    return apiRequest('/mapped-accounts/branch');
  },
  getAccountDetail: async (accountNumber: string) => {
    return apiRequest(`/mapped-accounts/account/${encodeURIComponent(accountNumber)}`);
  },
  update: async (accountNumber: string, data: any) => {
    return apiRequest(`/mapped-accounts/account/${encodeURIComponent(accountNumber)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export const configAPI = {
  getConfig: async () => {
    return apiRequest('/config');
  },
};

export const settingsAPI = {
  getBalanceSource: async () => {
    return apiRequest('/settings/balance-source');
  },
  updateBalanceSource: async (balanceSource: 'cbs' | 'approval') => {
    return apiRequest('/settings/balance-source', {
      method: 'PUT',
      body: JSON.stringify({ balanceSource }),
    });
  },
};

export const teamsAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/teams${queryString}`);
  },
  create: async (teamData: any) => {
    return apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest(`/teams/${id}`, {
      method: 'DELETE',
    });
  },
};

export const nplAPI = {
  getStaff: async () => {
    return apiRequest('/npl/staff');
  },
  getBranch: async (branchId?: string) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    return apiRequest(`/npl/branch${params}`);
  },
  getArea: async () => {
    return apiRequest('/npl/area');
  },
  getHq: async () => {
    return apiRequest('/npl/hq');
  },
  getTeamAlerts: async () => {
    return apiRequest('/npl/team-alerts');
  },
  getSchedule: async (accountId: string) => {
    return apiRequest(`/npl/schedules/${accountId}`);
  },
  generateSchedule: async (accountId: string) => {
    return apiRequest(`/npl/schedules/${accountId}/generate`, { method: 'POST' });
  },
  markPaid: async (scheduleId: string, data: { paidAmount?: number; paidDate?: string }) => {
    return apiRequest(`/npl/schedules/${scheduleId}/pay`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  triggerSnapshot: async (branchId?: string) => {
    return apiRequest('/npl/snapshot', {
      method: 'POST',
      body: JSON.stringify({ branchId }),
    });
  },
};

export const notificationsAPI = {
  getAll: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return apiRequest(`/notifications${query}`);
  },
  getUnreadCount: async () => {
    return apiRequest('/notifications/unread-count');
  },
  markAsRead: async (id: string) => {
    return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllAsRead: async () => {
    return apiRequest('/notifications/read-all', { method: 'POST' });
  },
};

