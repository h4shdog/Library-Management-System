// ============================================================
// COMPONENT: Admin — User Modal
// Used by: app/admin/users/page.jsx
// Purpose: Add or edit a user account
// ============================================================
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

export function UserModal({ isOpen, user, onClose, onSave }) {
  const [formData, setFormData] = useState(
    user || {
      name: '',
      email: '',
      role: 'student',
      phone: '',
      address: '',
      password: '',
      confirmPassword: '',
    }
  );
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!user && !formData.password) newErrors.password = 'Password is required';
    if (!user && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!user && formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave({
        ...formData,
        id: user?.id || crypto.randomUUID(),
        joinDate: user?.joinDate || new Date().toISOString().split('T')[0],
        status: user?.status || 'active',
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Added py-12 to create space at the top/bottom of the screen
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 py-12 overflow-y-auto">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Kept max-h-96 to maintain original height logic */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Full Name *</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`border-slate-200 focus:ring-[#cbb0f8] ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-xs text-red-500 font-bold">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Email *</label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`border-slate-200 focus:ring-[#cbb0f8] ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Role *</label>
            <select
              value={formData.role || 'student'}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#cbb0f8] outline-none"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Password {!user && <span className="text-red-500">*</span>}</label>
            <Input
              type="password"
              value={formData.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder={user ? "Leave empty to keep current" : "Set initial password"}
              className={`border-slate-200 focus:ring-[#cbb0f8] ${errors.password ? 'border-red-500' : ''}`}
            />
            {!user && <p className="text-xs text-slate-400">User will log in with this password. Min 6 characters.</p>}
            {errors.password && <p className="text-xs text-red-500 font-bold">{errors.password}</p>}
          </div>

          {/* Confirm Password — new users only */}
          {!user && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Confirm Password <span className="text-red-500">*</span></label>
              <Input
                type="password"
                value={formData.confirmPassword || ''}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
                className={`border-slate-200 focus:ring-[#cbb0f8] ${errors.confirmPassword ? 'border-red-500' : ''}`}
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 font-bold">{errors.confirmPassword}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Phone</label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="border-slate-200 focus:ring-[#cbb0f8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Address</label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 font-medium min-h-[80px] focus:ring-2 focus:ring-[#cbb0f8] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#cbb0f8] hover:bg-[#b594f0] text-white font-bold shadow-md shadow-purple-100"
          >
            {isSaving ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </Card>
    </div>
  );
}