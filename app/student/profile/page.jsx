// ============================================================
// ROLE: Student | PAGE: Profile Settings
// Route: /student/profile
// ============================================================
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage]               = useState(null);

  const [formData, setFormData] = useState({
    name:    user?.name    || '',
    phone:   user?.phone   || '',
    address: user?.address || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      if (passwords.newPassword) {
        if (passwords.newPassword !== passwords.confirmPassword) {
          setMessage({ type: 'error', text: 'New passwords do not match' });
          setIsSaving(false);
          return;
        }
        if (passwords.newPassword.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
          setIsSaving(false);
          return;
        }
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
        if (error) {
          setMessage({ type: 'error', text: error.message });
          setIsSaving(false);
          return;
        }
      }
      await updateUser({ ...user, name: formData.name, phone: formData.phone, address: formData.address });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsEditing(false);
    setMessage(null);
  };

  if (!user) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account information</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Information */}
      <Card className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Profile Information</h2>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="ghost"
              className="text-blue-600 hover:bg-blue-50 font-semibold"
            >
              Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Full Name</Label>
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                className="border-slate-200 focus:ring-blue-300 h-11"
              />
            ) : (
              <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                {user.name || '—'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Email</Label>
            <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-500 border border-slate-100">
              {user.email || '—'}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Phone</Label>
            {isEditing ? (
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Your phone number"
                className="border-slate-200 focus:ring-blue-300 h-11"
              />
            ) : (
              <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                {user.phone || 'Not provided'}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Address</Label>
            {isEditing ? (
              <Input
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Your address"
                className="border-slate-200 focus:ring-blue-300 h-11"
              />
            ) : (
              <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                {user.address || 'Not provided'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Role</Label>
            <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100 capitalize">
              {user.role}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Member Since</Label>
            <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
              {user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Borrowing Limit</Label>
            <div className="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
              {user.borrowingLimit || 5} books
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password — only while editing */}
      {isEditing && (
        <Card className="border border-blue-100 bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Change Password <span className="text-sm font-normal text-slate-400">(optional)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">New Password</Label>
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
              <Label className="text-sm font-semibold text-slate-700">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="border-slate-200 h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl gap-2"
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
