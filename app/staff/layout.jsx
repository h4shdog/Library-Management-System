// ============================================================
// STAFF LAYOUT — Wraps all /staff/* pages
// Theme: Teal/Green | CSS: styles/staff.css
// ============================================================
'use client';

import { StaffLayout } from '@/components/layout/StaffLayout';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function StaffLayoutWrapper({ children }) {
  return (
    <AuthGuard requiredRole="staff">
      <StaffLayout>{children}</StaffLayout>
    </AuthGuard>
  );
}
