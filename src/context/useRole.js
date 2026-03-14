import { useAuth } from './AuthContext';

/**
 * RBAC Permission Matrix
 * 
 * | Feature                    | Admin | Manager | Staff |
 * |----------------------------|:-----:|:-------:|:-----:|
 * | Create/Delete Products     |  ✅   |   ❌    |  ❌   |
 * | Edit Products              |  ✅   |   ✅    |  ❌   |
 * | Inventory Adjustments      |  ✅   |   ❌    |  ❌   |
 * | View Analytics             |  ✅   |   ✅    |  ❌   |
 * | Create Receipts            |  ✅   |   ✅    |  ❌   |
 * | Manage Transfers           |  ✅   |   ✅    |  ✅   |
 * | Scan QR / View Products    |  ✅   |   ✅    |  ✅   |
 * | View Blockchain Ledger     |  ✅   |   ✅    |  ❌   |
 * | View Deliveries            |  ✅   |   ✅    |  ✅   |
 * | Create Deliveries          |  ✅   |   ✅    |  ❌   |
 */

const PERMISSIONS = {
  // Products
  'products.create':     ['admin'],
  'products.edit':       ['admin', 'manager'],
  'products.delete':     ['admin'],
  'products.view':       ['admin', 'manager', 'staff'],
  
  // Receipts
  'receipts.create':     ['admin', 'manager'],
  'receipts.confirm':    ['admin', 'manager'],
  'receipts.view':       ['admin', 'manager'],

  // Deliveries
  'deliveries.create':   ['admin', 'manager'],
  'deliveries.advance':  ['admin', 'manager'],
  'deliveries.view':     ['admin', 'manager', 'staff'],

  // Transfers
  'transfers.create':    ['admin', 'manager', 'staff'],
  'transfers.view':      ['admin', 'manager', 'staff'],

  // Adjustments
  'adjustments.create':  ['admin'],
  'adjustments.view':    ['admin'],

  // Analytics
  'analytics.view':      ['admin', 'manager'],

  // Blockchain
  'blockchain.view':     ['admin', 'manager'],

  // Dashboard (everyone)
  'dashboard.view':      ['admin', 'manager', 'staff'],
};

export function useRole() {
  const { profile } = useAuth();
  const role = profile?.role || 'staff';

  /**
   * Check if the current user has a specific permission.
   * @param {string} permission - The permission key (e.g. 'products.create')
   * @returns {boolean}
   */
  const can = (permission) => {
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
  };

  /**
   * Check if the user role is one of the given roles.
   * @param {string[]} roles
   * @returns {boolean}
   */
  const isRole = (...roles) => roles.includes(role);

  return { role, can, isRole };
}
