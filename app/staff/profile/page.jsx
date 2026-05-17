// ============================================================
// ROLE: Staff | PAGE: Profile Settings
// Route: /staff/profile
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X, Eye, EyeOff } from 'lucide-react';

export default function StaffProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing]       = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name:    user.name    ?? '',
        email:   user.email   ?? '',
        phone:   user.phone   ?? '',
        address: user.address ?? '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMessage('Name and email are required.');
      return;
    }
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      if (passwords.newPassword) {
        if (!passwords.currentPassword) {
          setErrorMessage('Current password is required.');
          setIsSaving(false);
          return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
          setErrorMessage('New passwords do not match.');
          setIsSaving(false);
          return;
        }
        if (passwords.newPassword.length < 6) {
          setErrorMessage('New password must be at least 6 characters.');
          setIsSaving(false);
          return;
        }
        const supabase = createClient();
        const { error: pwError } = await supabase.auth.updateUser({ password: passwords.newPassword });
        if (pwError) {
          setErrorMessage(pwError.message);
          setIsSaving(false);
          return;
        }
      }
      if (user) {
        await updateUser({ ...user, name: formData.name, phone: formData.phone, address: formData.address });
      }
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({ name: user.name ?? '', email: user.email ?? '', phone: user.phone ?? '', address: user.address ?? '' });
    }
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsEditing(false);
    setErrorMessage('');
  };

  if (!user) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account information and security</p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Account Information */}
      <Card className="border-slate-200 bg-white p-6 space-y-4 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="ghost" className="text-emerald-600 hover:bg-emerald-50 font-semibold">
              Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              disabled={!isEditing}
              placeholder="Your full name"
              className="border-slate-200 disabled:bg-slate-50 h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <Input
              type="email"
              value={formData.email}
              disabled
              className="border-slate-200 bg-slate-50 h-11"
            />
            <p className="text-xs text-slate-400">Email cannot be changed here.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Phone Number</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              disabled={!isEditing}
              placeholder="+1 (555) 000-0000"
              className="border-slate-200 disabled:bg-slate-50 h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              disabled={!isEditing}
              placeholder="Your address"
              className="w-full p-3 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <Input value={user.role ?? ''} disabled className="border-slate-200 bg-slate-50 h-11 capitalize" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Member Since</label>
            <Input
              value={user.joinDate ? new Date(user.joinDate).toLocaleDateString() : ''}
              disabled
              className="border-slate-200 bg-slate-50 h-11"
            />
          </div>
        </div>
      </Card>

      {/* Change Password — only while editing */}
      {isEditing && (
        <Card className="border-emerald-200 bg-white p-6 space-y-4 shadow-sm rounded-2xl">
          <h2 className="text-lg font-bold text-slate-900">
            Change Password <span className="text-sm font-normal text-slate-400">(optional)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Current Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="border-slate-200 h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="border-slate-200 h-11 pr-10"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="border-slate-200 h-11"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Save / Cancel */}
      {isEditing && (
        <div className="flex gap-3">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 rounded-xl gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 font-semibold h-11 rounded-xl gap-2"
          >
            <X size={16} />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
