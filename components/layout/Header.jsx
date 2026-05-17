'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const roleConfig = {
  student: { label: 'Student',       color: 'bg-blue-600',   text: 'text-blue-600',   ring: 'ring-blue-200',   profileHref: '/student/profile' },
  staff:   { label: 'Staff',         color: 'bg-emerald-600',text: 'text-emerald-600',ring: 'ring-emerald-200',profileHref: '/staff/profile' },
  admin:   { label: 'Administrator', color: 'bg-violet-600', text: 'text-violet-600', ring: 'ring-violet-200', profileHref: '/admin/profile' },
};

export function Header({ onMobileMenuToggle }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const cfg = roleConfig[user?.role] || roleConfig.student;

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push(cfg.profileHref);
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-100 bg-white/95 backdrop-blur-md flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile menu toggle */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      {user && (
        <div className="flex items-center gap-3">
          {/* Role badge */}
          <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} text-white`}>
            {cfg.label}
          </span>

          {/* Profile dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${cfg.color}`}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-slate-700 max-w-[120px] truncate">
                {user.name}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-slate-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleProfile}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                >
                  <User size={15} className="text-slate-400" />
                  Profile Settings
                </button>
                <div className="border-t border-slate-50 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
