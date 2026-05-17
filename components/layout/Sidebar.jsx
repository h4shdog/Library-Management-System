'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import {
  X, LayoutDashboard, BookOpen, ClipboardList,
  Sparkles, History, Bell, Users, CreditCard,
  LineChart, Settings, Clock,
} from 'lucide-react';

const studentNavItems = [
  { label: 'Dashboard',       href: '/student/dashboard',       icon: LayoutDashboard },
  { label: 'Book Catalog',    href: '/student/catalog',         icon: BookOpen },
  { label: 'My Requests',     href: '/student/my-requests',     icon: ClipboardList },
  { label: 'Recommendations', href: '/student/recommendations', icon: Sparkles },
  { label: 'History',         href: '/student/history',         icon: History,      dotKey: 'history' },
  { label: 'Notifications',   href: '/student/notifications',   icon: Bell,         dotKey: 'notifications' },
];

const staffNavItems = [
  { label: 'Dashboard',     href: '/staff/dashboard',    icon: LayoutDashboard },
  { label: 'User Accounts', href: '/staff/users',        icon: Users },
  { label: 'Catalog',       href: '/staff/catalog',      icon: BookOpen },
  { label: 'Requests',      href: '/staff/requests',     icon: ClipboardList, dotKey: 'requests' },
  { label: 'Transactions',  href: '/staff/transactions', icon: CreditCard },
];

const adminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users',     href: '/admin/users',     icon: Users },
  { label: 'Catalog',   href: '/admin/catalog',   icon: BookOpen },
  { label: 'Requests',  href: '/admin/requests',  icon: ClipboardList, dotKey: 'requests' },
  { label: 'Reports',   href: '/admin/reports',   icon: LineChart },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings },
];

const roleConfig = {
  student: {
    nav: studentNavItems,
    accent: 'bg-blue-600',
    activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-200',
    hoverBg: 'hover:bg-blue-50 hover:text-blue-700',
    iconActive: 'text-white',
    iconIdle: 'text-slate-400 group-hover:text-blue-600',
  },
  staff: {
    nav: staffNavItems,
    accent: 'bg-emerald-600',
    activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200',
    hoverBg: 'hover:bg-emerald-50 hover:text-emerald-700',
    iconActive: 'text-white',
    iconIdle: 'text-slate-400 group-hover:text-emerald-600',
  },
  admin: {
    nav: adminNavItems,
    accent: 'bg-violet-600',
    activeBg: 'bg-violet-600 text-white shadow-lg shadow-violet-200',
    hoverBg: 'hover:bg-violet-50 hover:text-violet-700',
    iconActive: 'text-white',
    iconIdle: 'text-slate-400 group-hover:text-violet-600',
  },
};

const DEFAULT_LIBRARY_HOURS = {
  weekdays: { isOpen: true,  openTime: '08:00', closeTime: '20:00' },
  weekend:  { isOpen: false, openTime: '10:00', closeTime: '17:00' },
};

/** Format "08:00" → "8:00" (compact, no AM/PM for sidebar) */
function fmtTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function normalizeHours(saved) {
  if (!saved) return DEFAULT_LIBRARY_HOURS;
  // Migrate old array format → grouped
  if (Array.isArray(saved)) {
    const weekday = saved.find((d) => d.day === 'Monday') || {};
    const weekend = saved.find((d) => d.day === 'Saturday') || {};
    return {
      weekdays: { isOpen: weekday.isOpen ?? true,  openTime: weekday.openTime ?? '08:00', closeTime: weekday.closeTime ?? '20:00' },
      weekend:  { isOpen: weekend.isOpen ?? false, openTime: weekend.openTime ?? '10:00', closeTime: weekend.closeTime ?? '17:00' },
    };
  }
  return saved;
}

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // dots: { notifications: bool, history: bool, requests: bool }
  const [dots, setDots] = useState({});
  const channelsRef = useRef([]);

  // Live library hours from Supabase
  const [libraryHours, setLibraryHours] = useState(DEFAULT_LIBRARY_HOURS);

  useEffect(() => {
    const supabase = createClient();

    const fetchHours = async () => {
      const { data, error } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'library_hours')
        .single();
      if (!error && data?.value) {
        setLibraryHours(normalizeHours(data.value));
      }
    };

    fetchHours();

    // Realtime: update instantly when admin saves
    const hoursChannel = supabase
      .channel('sidebar-library-hours')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'library_settings',
        filter: 'key=eq.library_hours',
      }, (payload) => {
        if (payload.new?.value) {
          setLibraryHours(normalizeHours(payload.new.value));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(hoursChannel);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const newDots = {};

    const fetchDots = async () => {
      if (user.role === 'student') {
        // Unread notifications
        const { count: unreadCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        newDots.notifications = (unreadCount || 0) > 0;

        // New history: completed/returned requests newer than last viewed
        const { data: profileData } = await supabase
          .from('profiles')
          .select('history_last_viewed')
          .eq('id', user.id)
          .single();

        const lastViewed = profileData?.history_last_viewed;
        let historyQuery = supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['completed', 'returned']);

        if (lastViewed) {
          historyQuery = historyQuery.gt('updated_at', lastViewed);
        }

        const { count: historyCount } = await historyQuery;
        newDots.history = (historyCount || 0) > 0;
      }

      if (user.role === 'staff' || user.role === 'admin') {
        // Pending requests
        const { count: pendingCount } = await supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        newDots.requests = (pendingCount || 0) > 0;
      }

      setDots(newDots);
    };

    fetchDots();

    // Real-time: update dots when data changes
    if (user.role === 'student') {
      const notifChannel = supabase
        .channel(`sidebar-notif-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => fetchDots())
        .subscribe();

      const reqChannel = supabase
        .channel(`sidebar-history-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'requests',
          filter: `user_id=eq.${user.id}`,
        }, () => fetchDots())
        .subscribe();

      channelsRef.current = [notifChannel, reqChannel];
    }

    if (user.role === 'staff' || user.role === 'admin') {
      const reqChannel = supabase
        .channel(`sidebar-requests-${user.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'requests',
        }, () => fetchDots())
        .subscribe();

      channelsRef.current = [reqChannel];
    }

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user?.id, user?.role]);

  // Clear dot when user visits the page
  useEffect(() => {
    if (pathname === '/student/notifications') {
      setDots((d) => ({ ...d, notifications: false }));
    }
    if (pathname === '/student/history') {
      setDots((d) => ({ ...d, history: false }));
      // Persist last-viewed timestamp so dot stays gone after re-login
      if (user?.id) {
        const supabase = createClient();
        supabase
          .from('profiles')
          .update({ history_last_viewed: new Date().toISOString() })
          .eq('id', user.id);
      }
    }
  }, [pathname, user?.id]);

  if (!user) return null;

  const cfg = roleConfig[user.role] || roleConfig.student;

  const wkd = libraryHours.weekdays;
  const wkn = libraryHours.weekend;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm lg:hidden z-30"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-slate-100 transition-transform duration-300 flex flex-col',
          'lg:sticky lg:top-0 lg:z-20 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.accent)}>
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">AILibrary</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                {user.role} portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0', cfg.accent)}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
            Navigation
          </p>
          {cfg.nav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const showDot = item.dotKey && dots[item.dotKey];

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive ? cfg.activeBg : cn('text-slate-600', cfg.hoverBg)
                )}
              >
                <Icon
                  size={18}
                  className={cn('shrink-0 transition-colors', isActive ? cfg.iconActive : cfg.iconIdle)}
                />
                <span className="flex-1">{item.label}</span>
                {/* Indicator dot */}
                {showDot && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Library hours footer — live from Supabase */}
        <div className="px-4 py-4 border-t border-slate-100 shrink-0">
          <div className="p-3 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Library Hours</span>
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Mon – Fri</span>
                {wkd.isOpen ? (
                  <span className="font-semibold text-slate-700">
                    {fmtTime(wkd.openTime)} – {fmtTime(wkd.closeTime)}
                  </span>
                ) : (
                  <span className="font-semibold text-red-400">Closed</span>
                )}
              </div>
              <div className="flex justify-between">
                <span>Sat – Sun</span>
                {wkn.isOpen ? (
                  <span className="font-semibold text-slate-700">
                    {fmtTime(wkn.openTime)} – {fmtTime(wkn.closeTime)}
                  </span>
                ) : (
                  <span className="font-semibold text-red-400">Closed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
