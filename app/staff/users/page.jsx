// ============================================================
// ROLE: Staff | PAGE: User Management (student accounts)
// Route: /staff/users
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect } from 'react';
import { Search, Edit2, Trash2, Users, X, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StaffUsersPage() {
  const { allUsers, updateUser, deleteUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const students = allUsers.filter((u) => u.role === 'student');
  const [users, setUsers] = useState([]);

  // Keep local state in sync with allUsers
  useEffect(() => {
    setUsers(students);
  }, [allUsers]);

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null, userName: '' });

  const filtered = useMemo(() => users.filter(
    (u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  ), [searchQuery, users]);

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) return;
    await updateUser({ ...editingUser, ...editForm });
    setEditingUser(null);
  };

  const handleDeleteClick = (user) => {
    setDeleteConfirm({ isOpen: true, userId: user.id, userName: user.name });
  };

  const handleDeleteConfirm = async () => {
    await deleteUser(deleteConfirm.userId);
    setDeleteConfirm({ isOpen: false, userId: null, userName: '' });
  };

  const activeCount    = users.filter((u) => u.status === 'active').length;
  const suspendedCount = users.filter((u) => u.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage student accounts and permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: users.length,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active',         value: activeCount,     color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Suspended',      value: suspendedCount,  color: 'text-slate-500',   bg: 'bg-slate-50' },
        ].map((s, i) => (
          <Card key={i} className={`border border-slate-100 ${s.bg} p-5 rounded-2xl`}>
            <Users size={18} className={`${s.color} mb-3`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="border border-slate-100 bg-white p-4 rounded-2xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 rounded-xl text-sm"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['User', 'Email', 'Join Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.status !== 'active' ? 'opacity-60' : ''}`}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-sm text-slate-600">{user.email}</td>
                  <td className="py-3.5 px-5 text-xs text-slate-400">{new Date(user.joinDate).toLocaleDateString()}</td>
                  <td className="py-3.5 px-5">
                    <Badge className={user.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 border-0 text-xs'
                      : 'bg-red-100 text-red-600 border-0 text-xs'
                    }>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(user)}
                        className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        title="Edit user"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user)}
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 rounded-lg"
                        title="Delete user"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <Card
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Student</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Full Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Student name"
                  className="h-10 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email *</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="student@example.com"
                  className="h-10 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <Input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="555-0000"
                  className="h-10 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Address</label>
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="123 Main St"
                  className="h-10 border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-xl border-slate-200 text-slate-600 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
              >
                <Save size={15} />
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, userId: null, userName: '' })}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Student?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteConfirm.userName}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
