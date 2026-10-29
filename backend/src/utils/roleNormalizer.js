/**
 * Normalizes role names from old format to new format
 * Handles both 'Branch Manager' → 'branchManager' and 'branchManager' → 'branchManager'
 */
export function normalizeRole(role) {
  if (!role) return null;

  const roleMap = {
    'admin': 'admin',
    'areaManager': 'areaManager',
    'branchManager': 'branchManager',
    'supervisor': 'supervisor',
    'staff': 'staff',
    // Position → Role mappings
    'CEO': 'admin',
    'Area Manager': 'areaManager',
    'Branch Manager': 'branchManager',
    'Operation Supervisor': 'supervisor',
    'Customer Relationship Supervisor': 'supervisor',
    'Customer Service Officer I': 'staff',
    'Customer Service Officer II': 'staff',
    'Sales & Marketing Officer I': 'staff',
    'Customer Relationship Officer I': 'staff',
    'Internal Auditor': 'staff',
  };

  if (roleMap[role]) {
    return roleMap[role];
  }

  const lowerRole = role.toLowerCase().trim();
  for (const [key, value] of Object.entries(roleMap)) {
    if (key.toLowerCase() === lowerRole) {
      return value;
    }
  }

  return role;
}

