// ============================================================
// ADMIN LAYOUT — Wraps all /admin/* pages
// Theme: Purple | CSS: styles/admin.css
// ============================================================
'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function AdminLayoutWrapper({ children }) {
  return (
    <AuthGuard requiredRole="admin">
      <div className="admin-theme min-h-screen bg-background">
        <AdminLayout>
          <div className="rounded-2xl overflow-hidden">
            {children}
          </div>
        </AdminLayout>
      </div>
    </AuthGuard>
  );
}
