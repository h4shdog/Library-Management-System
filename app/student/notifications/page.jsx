// ============================================================
// ROLE: Student | PAGE: Notifications (real-time)
// Route: /student/notifications
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, Trash2, Loader } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const typeConfig = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-100', icon_color: 'text-emerald-500' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50 border-amber-100',     icon_color: 'text-amber-500'   },
  error:   { icon: AlertCircle, bg: 'bg-red-50 border-red-100',         icon_color: 'text-red-500'     },
  info:    { icon: Info,        bg: 'bg-blue-50 border-blue-100',       icon_color: 'text-blue-500'    },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    // Initial fetch
    const fetchNotifs = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
      setIsLoading(false);
    };

    fetchNotifs();

    // Real-time subscription
    channelRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => n.id === payload.new.id ? payload.new : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id]);

  const markRead = async (id) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    // Real-time will update state, but also update locally for instant feedback
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  };

  const remove = async (id) => {
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((n) => n.filter((x) => x.id !== id));
  };

  const markAll = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  };

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) => n.read);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unread.length > 0
              ? `${unread.length} unread notification${unread.length !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          {unread.length > 0 && (
            <Button
              onClick={markAll}
              variant="outline"
              size="sm"
              className="text-xs border-slate-200 text-slate-600 rounded-xl h-8"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Unread */}
      {unread.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            New ({unread.length})
          </p>
          {unread.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className={`border ${cfg.bg} p-4 rounded-2xl`}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`${cfg.icon_color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {new Date(n.created_at).toLocaleDateString()} at{' '}
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => markRead(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors text-xs font-medium"
                    >
                      Read
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Earlier</p>
          {read.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className="border border-slate-100 bg-white p-4 rounded-2xl opacity-60">
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`${cfg.icon_color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(n.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {notifications.length === 0 && (
        <Card className="border border-slate-100 bg-white p-12 rounded-2xl text-center">
          <Bell size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-700">No notifications</p>
          <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
        </Card>
      )}
    </div>
  );
}
