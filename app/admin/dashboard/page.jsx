// ============================================================
// ROLE: Admin | PAGE: Dashboard
// Route: /admin/dashboard
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, BookOpen, Clock, TrendingUp, ArrowRight, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ users: 0, books: 0, activeRequests: 0, completionRate: '—' });
  const [metrics, setMetrics] = useState({
    totalBorrowings: '—',
    returnRate: '—',
    avgBooksPerUser: '—',
    overdueBooks: '—',
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    const fetchStats = async () => {
      const [usersRes, booksRes, requestsRes, allRequestsRes, activityRes, overdueRes] =
        await Promise.all([
          // Total users
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          // Active books
          supabase.from('books').select('id', { count: 'exact', head: true }).eq('archived', false),
          // Active requests (pending + approved)
          supabase.from('requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'approved']),
          // All requests for metrics
          supabase.from('requests').select('status'),
          // Recent activity
          supabase.from('requests')
            .select('id, type, status, created_at, profiles(name), books(title)')
            .order('created_at', { ascending: false })
            .limit(4),
          // Overdue: approved requests past due date
          supabase.from('requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved')
            .lt('due_date', new Date().toISOString().split('T')[0]),
        ]);

      const totalUsers = usersRes.count || 0;
      const allReqs    = allRequestsRes.data || [];
      const total      = allReqs.length;
      const completed  = allReqs.filter((r) => r.status === 'completed' || r.status === 'returned').length;
      const returned   = allReqs.filter((r) => ['completed', 'returned', 'approved'].includes(r.status)).length;

      setCounts({
        users:          totalUsers,
        books:          booksRes.count || 0,
        activeRequests: requestsRes.count || 0,
        completionRate: total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%',
      });

      setMetrics({
        totalBorrowings: total.toLocaleString(),
        returnRate:      total > 0 ? `${Math.round((returned / total) * 100)}%` : '0%',
        avgBooksPerUser: totalUsers > 0 ? (total / totalUsers).toFixed(1) : '0',
        overdueBooks:    String(overdueRes.count || 0),
      });

      if (!activityRes.error && activityRes.data) {
        setRecentActivity(
          activityRes.data.map((r) =>
            `"${r.books?.title || 'Unknown'}" ${r.type} by ${r.profiles?.name || 'Unknown'} — ${r.status}`
          )
        );
      }
    };

    fetchStats();
  }, []);

  const stats = [
    { label: 'Total Users',     value: counts.users,          icon: Users,      color: 'bg-violet-100 text-violet-600',  border: 'border-violet-100' },
    { label: 'Total Books',     value: counts.books,          icon: BookOpen,   color: 'bg-blue-100 text-blue-600',      border: 'border-blue-100' },
    { label: 'Active Requests', value: counts.activeRequests, icon: Clock,      color: 'bg-amber-100 text-amber-600',    border: 'border-amber-100' },
    { label: 'Completion Rate', value: counts.completionRate, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600',border: 'border-emerald-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.name}. Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border ${stat.border} bg-white p-5 rounded-2xl`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Manage Users',   href: '/admin/users',   color: 'hover:bg-violet-50 hover:text-violet-700' },
              { label: 'Manage Catalog', href: '/admin/catalog', color: 'hover:bg-blue-50 hover:text-blue-700' },
              { label: 'View Reports',   href: '/admin/reports', color: 'hover:bg-emerald-50 hover:text-emerald-700' },
              { label: 'Settings',       href: '/admin/settings',color: 'hover:bg-slate-100 hover:text-slate-900' },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 transition-all ${action.color}`}>
                  {action.label}
                  <ArrowRight size={15} className="opacity-50" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Key metrics */}
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Key Metrics</h2>
          <div className="space-y-4">
            {[
              { label: 'Total Borrowings',  value: metrics.totalBorrowings, color: 'text-violet-600' },
              { label: 'Return Rate',        value: metrics.returnRate,      color: 'text-emerald-600' },
              { label: 'Avg Books / User',   value: metrics.avgBooksPerUser, color: 'text-blue-600' },
              { label: 'Overdue Books',      value: metrics.overdueBooks,    color: 'text-amber-600' },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{m.label}</span>
                <span className={`text-sm font-bold ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:text-violet-700 h-7 px-2">
                View all
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System status */}
      <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">System Status</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Database',       status: 'Operational' },
            { label: 'API Services',   status: 'Operational' },
            { label: 'Library System', status: 'Active' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
              <Badge className="bg-emerald-500 text-white border-0 text-xs">{s.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
