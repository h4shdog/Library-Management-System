// ============================================================
// LAYOUT: Staff Shell
// Used by: app/staff/layout.jsx
// Contains: Sidebar + Header for all staff pages
// Theme: Teal/Green (#7BA99D) | CSS: styles/staff.css
// ============================================================
'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function StaffLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="staff-theme flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Header
          showMobileMenu
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
