// ============================================================
// ROLE: Admin | PAGE: User Management
// Route: /admin/users
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, Plus, Download, User as UserIcon } from 'lucide-react';
import { UserModal } from '@/components/admin/user-modal';
import { ExportModal } from '@/components/admin/export-modal';
import { useToast } from '@/components/shared/Toast';

export default function AdminUsersPage() {
  const { allUsers, addUser, updateUser, deleteUser } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(undefined);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [searchQuery, roleFilter, statusFilter, allUsers]);

  const handleToggleUserStatus = async (userId) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'deactivated' : 'active';
    await updateUser({ ...target, status: newStatus });
    toast.success(`${target.name} ${newStatus === 'deactivated' ? 'deactivated' : 'reactivated'} successfully`);
  };

  const handleOpenAddModal = () => {
    setEditingUser(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (user) => {
    if (editingUser) {
      await updateUser(user);
      toast.success(`${user.name} updated successfully`);
    } else {
      await addUser(user);
      toast.success(`${user.name} added successfully`);
    }
    setIsModalOpen(false);
  };

  const roleStats = {
    student: allUsers.filter((u) => u.role === 'student').length,
    staff:   allUsers.filter((u) => u.role === 'staff').length,
    admin:   allUsers.filter((u) => u.role === 'admin').length,
  };

  return (
    <>
    <div className="min-h-screen bg-[#F3F0FF]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 font-medium text-sm mt-1">Manage library users, roles, and access</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsExportModalOpen(true)}
              variant="outline"
              className="border-slate-200 text-slate-600 hover:bg-white font-bold flex items-center gap-2"
            >
              <Download size={18} /> Export
            </Button>
            <Button
              onClick={handleOpenAddModal}
              className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Add User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Students', value: roleStats.student },
            { label: 'Staff',    value: roleStats.staff },
            { label: 'Admins',   value: roleStats.admin },
          ].map((stat, index) => (
            <Card key={index} className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm font-bold text-slate-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 focus:ring-[#cbb0f8]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-bold text-sm"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-bold text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f6ff] border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">User</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Email</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Role</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Status</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Join Date</th>
                  <th className="text-right py-4 px-6 font-bold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-[#fcfaff] transition-colors ${user.status === 'deactivated' ? 'opacity-60' : ''}`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#cbb0f8] border border-slate-200 overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <p className="font-bold text-slate-900">{user.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{user.email}</td>
                    <td className="py-4 px-6">
                      <Badge className="bg-[#f3f0ff] text-[#cbb0f8] border-none font-bold capitalize">{user.role}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={user.status === 'deactivated' ? 'bg-red-100 text-red-600 border-none font-bold' : 'bg-emerald-100 text-emerald-600 border-none font-bold'}>
                        {user.status === 'deactivated' ? 'Deactivated' : 'Active'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-bold">
                      {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(user)} className="text-[#cbb0f8] hover:bg-[#f3f0ff] font-bold">
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleUserStatus(user.id)}
                          className={user.status === 'deactivated' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-400 hover:bg-red-50'}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <UserModal isOpen={isModalOpen} user={editingUser} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} />
        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      </div>
    </div>
    <ToastContainer />
    </>
  );
}
