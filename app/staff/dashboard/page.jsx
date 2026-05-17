// ============================================================
// ROLE: Staff | PAGE: Dashboard
// Route: /staff/dashboard
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { LibraryHours } from '@/components/shared/LibraryHours';

const statusColor = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  rejected:  'bg-red-100 text-red-600',
};

export default function StaffDashboard() {
  const { user, allUsers, allBooks } = useAuth();
  const [recentRequests, setRecentRequests] = useState([]);
  const [requestBooks, setRequestBooks] = useState({});

  useEffect(() => {
    const supabase = createClient();
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) {
        setRecentRequests(data);
        // fetch book titles for display
        const bookIds = [...new Set(data.map((r) => r.book_id))];
        if (bookIds.length > 0) {
          const { data: books } = await supabase.from('books').select('id, title').in('id', bookIds);
          if (books) {
            const map = {};
            books.forEach((b) => { map[b.id] = b.title; });
            setRequestBooks(map);
          }
        }
      }
    };
    fetchRequests();
  }, []);

  const students = allUsers.filter((u) => u.role === 'student').length;
  const books    = allBooks.filter((b) => !b.archived).length;
  const pending  = recentRequests.filter((r) => r.status === 'pending').length;
  const approved = recentRequests.filter((r) => r.status === 'approved').length;

  const statCards = [
    { label: 'Total Students', value: students, icon: Users,       color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Total Books',    value: books,    icon: BookOpen,    color: 'bg-blue-100 text-blue-600' },
    { label: 'Pending',        value: pending,  icon: Clock,       color: 'bg-amber-100 text-amber-600' },
    { label: 'Approved',       value: approved, icon: CheckCircle, color: 'bg-teal-100 text-teal-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const isNew = user?.joinDate === today;
            return isNew ? `Welcome, ${user?.name} !` : `Welcome back, ${user?.name} !`;
          })()} Manage library operations below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border border-slate-100 bg-white p-5 rounded-2xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.color}`}><Icon size={20} /></div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Review Requests', href: '/staff/requests',     color: 'hover:bg-amber-50 hover:text-amber-700' },
              { label: 'Manage Users',    href: '/staff/users',        color: 'hover:bg-emerald-50 hover:text-emerald-700' },
              { label: 'Manage Catalog',  href: '/staff/catalog',      color: 'hover:bg-blue-50 hover:text-blue-700' },
              { label: 'Transactions',    href: '/staff/transactions', color: 'hover:bg-slate-100 hover:text-slate-900' },
            ].map((a) => (
              <Link key={a.href} href={a.href}>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 transition-all ${a.color}`}>
                  {a.label}<ArrowRight size={15} className="opacity-50" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">System Status</h2>
          <div className="space-y-3">
            {[{ label: 'Database', status: 'Online' }, { label: 'API Services', status: 'Running' }, { label: 'Library Status', status: 'Active' }].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-sm font-medium text-slate-700">{s.label}</span>
                <Badge className="bg-emerald-500 text-white border-0 text-xs">{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Requests</h2>
            <Link href="/staff/requests">
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 h-7 px-2">View all</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">{requestBooks[req.book_id] || req.book_id}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{req.type}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[req.status] || 'bg-slate-100 text-slate-500'}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Library Hours */}
        <LibraryHours accentColor="text-emerald-500" headerBg="bg-emerald-50" />
      </div>
    </div>
  );
}
