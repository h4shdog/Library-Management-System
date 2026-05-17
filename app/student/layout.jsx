// ============================================================
// STUDENT LAYOUT — Wraps all /student/* pages
// Theme: Blue | CSS: styles/student.css
// ============================================================
'use client';

import { StudentLayout } from '@/components/layout/StudentLayout';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function StudentLayoutWrapper({ children }) {
  return (
    <AuthGuard requiredRole="student">
      <StudentLayout>{children}</StudentLayout>
    </AuthGuard>
  );
}
