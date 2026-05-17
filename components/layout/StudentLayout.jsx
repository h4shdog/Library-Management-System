// ============================================================
// LAYOUT: Student Shell
// Used by: app/student/layout.jsx
// Contains: Sidebar + Header for all student pages
// Theme: Blue (#6B8DBA) | CSS: styles/student.css
// ============================================================
'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function StudentLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="student-theme flex flex-col lg:flex-row min-h-screen bg-background">
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
