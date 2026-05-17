'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [validSession, setValidSession]       = useState(false);

  useEffect(() => {
    // Supabase puts the access token in the URL hash after clicking the reset link
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => router.push('/auth'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-lg shadow-violet-200">
            <BookOpen size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your new password below</p>
          </div>
        </div>

        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
          <div className="p-6 space-y-5">

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Password updated!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Redirecting you to login…</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {!success && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-10 border-slate-200 rounded-xl pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-10 border-slate-200 rounded-xl pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                >
                  {isSubmitting
                    ? <><Loader size={15} className="animate-spin mr-2" />Updating password…</>
                    : 'Update Password'
                  }
                </Button>
              </form>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
