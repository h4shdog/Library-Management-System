// ============================================================
// ROLE: Staff | PAGE: Transaction History
// Route: /staff/transactions
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Calendar, ArrowLeftRight, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StaffTransactionsPage() {
  const { allBooks } = useAuth();
  const [transactions, setTransactions] = useState([]);

  const getBook = (bookId) => allBooks.find((b) => b.id === bookId);

  useEffect(() => {
    const supabase = createClient();
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('requests')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
      if (data) setTransactions(data);
    };
    fetchTransactions();
  }, []);

  const stats = {
    total:     transactions.length,
    completed: transactions.filter((t) => t.status === 'completed' || t.status === 'returned').length,
    approved:  transactions.filter((t) => t.status === 'approved').length,
    pending:   transactions.filter((t) => t.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        <p className="text-sm text-slate-500 mt-1">Track all borrowing transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: stats.total,     icon: ArrowLeftRight, color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Approved',  value: stats.approved,  icon: CheckCircle,    color: 'text-teal-600',    bg: 'bg-teal-50' },
          { label: 'Pending',   value: stats.pending,   icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className={`border border-slate-100 ${s.bg} p-5 rounded-2xl`}>
              <Icon size={18} className={`${s.color} mb-3`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <p className="text-sm font-semibold text-slate-900">All Transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Book', 'User', 'Type', 'Request Date', 'Due Date', 'Status'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((t) => {
                const book = getBook(t.book_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 text-sm font-medium text-slate-800">{book?.title || 'Unknown'}</td>
                    <td className="py-3 px-5 text-xs text-slate-500">{t.profiles?.name || '—'}</td>
                    <td className="py-3 px-5">
                      <Badge className="text-[10px] bg-slate-100 text-slate-500 border-0 capitalize">{t.type}</Badge>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={11} />
                        {new Date(t.request_date || t.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-400">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-5"><StatusBadge status={t.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
