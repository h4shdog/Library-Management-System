// ============================================================
// ROLE: Admin | PAGE: Reports & Analytics
// Route: /admin/reports
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, BookOpen, CheckCircle2, Users, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ExportModal } from '@/components/admin/export-modal';

export default function AdminReportsPage() {
  const { allUsers, allBooks } = useAuth();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [requestStats, setRequestStats] = useState({ total: 0, completed: 0, active: 0, pending: 0 });

  useEffect(() => {
    const supabase = createClient();
    const fetchStats = async () => {
      const { data } = await supabase.from('requests').select('status');
      if (data) {
        setRequestStats({
          total:     data.length,
          completed: data.filter((r) => r.status === 'completed').length,
          active:    data.filter((r) => r.status === 'approved').length,
          pending:   data.filter((r) => r.status === 'pending').length,
        });
      }
    };
    fetchStats();
  }, []);

  const completionRate = requestStats.total > 0
    ? ((requestStats.completed / requestStats.total) * 100).toFixed(1) + '%'
    : '0%';
  const avgBorrowingsPerUser = allUsers.length > 0
    ? (requestStats.total / allUsers.length).toFixed(1)
    : '0';

  const totalAvailable = allBooks.reduce((sum, b) => sum + (b.availability || 0), 0);
  const totalCopies    = allBooks.reduce((sum, b) => sum + (b.totalCopies || 0), 0);

  return (
    <div className="min-h-screen bg-[#F3F0FF]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-600 font-medium text-sm mt-1">System-wide analytics and insights</p>
          </div>
          <Button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Download size={18} /> Export Report
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Borrowings',  value: requestStats.total,    icon: BookOpen,    color: '#a8c1f7' },
            { label: 'Completion Rate',   value: completionRate,         icon: CheckCircle2,color: '#9bd5c3' },
            { label: 'Active Users',      value: allUsers.length,        icon: Users,       color: '#cbb0f8' },
            { label: 'Avg Borrows/User',  value: avgBorrowingsPerUser,   icon: BarChart3,   color: '#9bd5c3' },
          ].map((metric, index) => (
            <Card key={index} className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <metric.icon size={24} style={{ color: metric.color }} />
              <div>
                <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                <p className="text-sm font-bold text-slate-500">{metric.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Detailed Stats */}
        <Card className="border-slate-200 bg-white p-6 space-y-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#cbb0f8]" /> Performance Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Borrowing Status</h3>
              <div className="space-y-4">
                {[
                  { label: 'Completed', value: requestStats.completed, total: requestStats.total, color: '#9bd5c3' },
                  { label: 'Active',    value: requestStats.active,    total: requestStats.total, color: '#a8c1f7' },
                  { label: 'Pending',   value: requestStats.pending,   total: requestStats.total, color: '#fcd34d' },
                ].map((item, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-500">{item.value} / {item.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%', backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collection Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'Total Books',       value: allBooks.filter((b) => !b.archived).length },
                  { label: 'Available Copies',  value: totalAvailable },
                  { label: 'Borrowed Copies',   value: totalCopies - totalAvailable },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3.5 bg-[#f8f6ff] border border-slate-100 rounded-xl">
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    <Badge className="bg-[#cbb0f8] text-white border-none font-bold">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      </div>
    </div>
  );
}
