'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AuthGuard({ children, requiredRole }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }

    // If user's role doesn't match the required role, redirect to their own dashboard
    if (requiredRole && user?.role !== requiredRole) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f5' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #64748b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && user?.role !== requiredRole) return null;

  return children;
}
