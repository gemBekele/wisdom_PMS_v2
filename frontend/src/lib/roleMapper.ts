export type UserRole =
  | 'admin'
  | 'areaManager'
  | 'branchManager'
  | 'supervisor'
  | 'staff';

export function mapBackendRoleToFrontend(backendRole: string): UserRole {
  if (!backendRole) return 'staff';

  const role = backendRole.trim();

  if (role === 'admin' || role === 'CEO' || role.toLowerCase().includes('admin') || role.toLowerCase() === 'ceo') {
    return 'admin';
  }

  if (role === 'areaManager' || role === 'Area Manager' || role.toLowerCase().includes('area manager')) {
    return 'areaManager';
  }

  if (role === 'branchManager' || role === 'Branch Manager' || role.toLowerCase().includes('branch manager')) {
    return 'branchManager';
  }

  if (role === 'supervisor' || role === 'Operation Supervisor' || role === 'Customer Relationship Supervisor' || role.toLowerCase().includes('supervisor')) {
    return 'supervisor';
  }

  return 'staff';
}

