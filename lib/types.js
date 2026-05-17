// ============================================================
// SECTION: User Types
// ============================================================

export const UserRole = {
  STUDENT: 'student',
  STAFF: 'staff',
  ADMIN: 'admin',
};

export const UserStatus = {
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
};

// ============================================================
// SECTION: Request Types
// ============================================================

export const RequestType = {
  BORROW: 'borrow',
  RESERVE: 'reserve',
};

export const RequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  RETURNED: 'returned',
};

// ============================================================
// SECTION: Notification Types
// ============================================================

export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// ============================================================
// SECTION: Genre Constants
// ============================================================

export const AVAILABLE_GENRES = [
  'Fiction',
  'Non-fiction',
  'Mystery',
  'Sci-Fi',
  'Romance',
  'Academic',
  'Biography',
  'Fantasy',
  'Thriller',
  'Poetry',
];
