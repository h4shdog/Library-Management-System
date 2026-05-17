'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader, BookOpen, GraduationCap, Shield, Users, Eye, EyeOff } from 'lucide-react';

const roles = [
  { value: 'student', label: 'Student',       icon: GraduationCap, color: 'border-blue-200 bg-blue-50 text-blue-700',   active: 'border-blue-500 bg-blue-500 text-white' },
  { value: 'staff',   label: 'Library Staff', icon: Users,          color: 'border-emerald-200 bg-emerald-50 text-emerald-700', active: 'border-emerald-500 bg-emerald-500 text-white' },
  { value: 'admin',   label: 'Admin',         icon: Shield,         color: 'border-violet-200 bg-violet-50 text-violet-700',   active: 'border-violet-500 bg-violet-500 text-white' },
];

const demoCredentials = {
  student: { email: 'student1@librarydemo.com', password: 'Student123!' },
  staff:   { email: 'staff1@librarydemo.com',   password: 'Staff123!' },
  admin:   { email: 'admin1@librarydemo.com',   password: 'Admin123!' },
};

export default function AuthPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, user, isLoading } = useAuth();
  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // If already logged in, redirect to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSignupSuccess(false);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push(`/${selectedRole}/dashboard`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email first. Check your inbox for the confirmation link.');
      } else if (
        msg.toLowerCase().includes('invalid login credentials') ||
        msg.toLowerCase().includes('invalid email or password')
      ) {
        // Check if the email exists to give a more specific message
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data } = await supabase.rpc('check_email_exists', { email_input: email }).maybeSingle();
        if (data === false || data === null) {
          setError('No account found with this email address. Please sign up first.');
        } else {
          setError('Incorrect password. Please try again.');
        }
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(email, password, name, 'student');
      // Switch to login and show verification notice
      setMode('login');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setSignupSuccess(true);
    } catch (err) {      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw new Error(resetError.message);
      setForgotSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = () => {
    const creds = demoCredentials[selectedRole];
    setEmail(creds.email);
    setPassword(creds.password);
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
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'login' ? 'Sign in to your library account' : mode === 'signup' ? 'Register to get started' : 'Enter your email to receive a reset link'}
            </p>
          </div>
        </div>

        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
          <div className="p-6 space-y-5">

            {/* Forgot password success */}
            {forgotSuccess && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Reset link sent!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Check your email for a password reset link. It may take a minute to arrive.
                  </p>
                </div>
              </div>
            )}

            {/* Signup success */}
            {signupSuccess && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Account created!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    A verification link has been sent to your email. Please check your inbox and click the link to activate your account before logging in.
                  </p>
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

            <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignUp : handleForgotPassword} className="space-y-4">

              {/* Role selector — login only */}
              {mode === 'login' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sign in as</label>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map(({ value, label, icon: Icon, color, active }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedRole(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${selectedRole === value ? active : color}`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name — signup only */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className="h-10 border-slate-200 rounded-xl"
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="h-10 border-slate-200 rounded-xl"
                />
              </div>

              {/* Password — not shown in forgot mode */}
              {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSignupSuccess(false); }}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              )}

              {/* Confirm Password — signup only */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-10 border-slate-200 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
              >
                {isSubmitting ? (
                  <><Loader size={15} className="animate-spin mr-2" />
                  {mode === 'login' ? 'Signing in…' : mode === 'signup' ? 'Creating account…' : 'Sending reset link…'}</>
                ) : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>
            </form>

            {/* Back to login — forgot mode */}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setForgotSuccess(false); setEmail(''); }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                ← Back to Sign In
              </button>
            )}

            {/* Demo credentials */}
            {mode === 'login' && (
              <button
                type="button"
                onClick={fillDemo}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
              >
                Use demo credentials ({selectedRole})
              </button>
            )}

            {/* Toggle mode */}
            <div className="text-center text-sm text-slate-500">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setConfirmPassword(''); setSignupSuccess(false); setShowPassword(false); setShowConfirmPassword(false); }}
                className="font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
