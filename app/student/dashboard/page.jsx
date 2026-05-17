// ============================================================
// ROLE: Student | PAGE: Dashboard
// Route: /student/dashboard
// ============================================================
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GenreSelectionModal } from '@/components/student/GenreSelectionModal';
import { getSmartRecommendations, getRecommendationMessage } from '@/lib/recommendations';
import { BookCard } from '@/components/shared/BookCard';
import { CardSkeleton } from '@/components/shared/Skeleton';
import Link from 'next/link';
import { BookOpen, Clock, CheckCircle, Bell, ArrowRight, Sparkles } from 'lucide-react';
import { LibraryHours } from '@/components/shared/LibraryHours';

const notifTypeColor = {
  success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  warning: 'bg-amber-50 border-amber-100 text-amber-700',
  info:    'bg-blue-50 border-blue-100 text-blue-700',
  error:   'bg-red-50 border-red-100 text-red-700',
};

export default function StudentDashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, updateUser, allBooks } = useAuth();
  const searchParams = useSearchParams();
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState(user?.preferredGenres || []);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Show genre modal on new account signup
  useEffect(() => {
    if (searchParams.get('setup') === '1') {
      setShowGenreModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !allBooks.length) return;
    const genres = selectedGenres.length > 0 ? selectedGenres : (user.preferredGenres || []);
    const results = getSmartRecommendations(allBooks, genres, [], [], [], 6);
    setRecommendedBooks(results.map((r) => r.book));
  }, [user, selectedGenres, allBooks]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchData = async () => {
      setIsLoading(true);
      const [reqRes, notifRes] = await Promise.all([
        supabase.from('requests').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      ]);
      if (!reqRes.error) setRequests(reqRes.data);
      if (!notifRes.error) setNotifications(notifRes.data);
      setIsLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const handleGenresSave = async (genres) => {
    setSelectedGenres(genres);
    if (user) {
      await updateUser({ ...user, preferredGenres: genres, preferencesSetup: true });
    }
  };

  const stats = [
    { label: 'Books Borrowed',   value: requests.filter((r) => r.status === 'approved').length,  icon: BookOpen,    color: 'bg-blue-100 text-blue-600' },
    { label: 'Pending Requests', value: requests.filter((r) => r.status === 'pending').length,   icon: Clock,       color: 'bg-amber-100 text-amber-600' },
    { label: 'Completed',        value: requests.filter((r) => r.status === 'completed').length, icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Unread Alerts',    value: notifications.filter((n) => !n.read).length,             icon: Bell,        color: 'bg-violet-100 text-violet-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        {(() => {
          const today = new Date().toISOString().split('T')[0];
          // New if joinDate is today OR joinDate is null (set by trigger, no explicit date)
          const isNew = !user?.joinDate || user.joinDate === today;
          const firstName = user?.name?.split(' ')[0];
          return (
            <>
              <h1 className="text-2xl font-bold text-slate-900">
                {isNew ? `Welcome, ${firstName} !` : `Welcome back, ${firstName} !`}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isNew ? "Great to have you here. Here's your library overview." : "Here's a quick overview of your library activity."}
              </p>
            </>
          );
        })()}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border border-slate-100 bg-white p-5 rounded-2xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Browse Catalog',     href: '/student/catalog',         color: 'hover:bg-blue-50 hover:text-blue-700' },
              { label: 'View My Requests',   href: '/student/my-requests',     color: 'hover:bg-amber-50 hover:text-amber-700' },
              { label: 'AI Recommendations', href: '/student/recommendations', color: 'hover:bg-violet-50 hover:text-violet-700' },
              { label: 'Borrowing History',  href: '/student/history',         color: 'hover:bg-slate-100 hover:text-slate-900' },
            ].map((a) => (
              <Link key={a.href} href={a.href}>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 transition-all ${a.color}`}>
                  {a.label}
                  <ArrowRight size={15} className="opacity-50" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="border border-slate-100 bg-white p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Notifications</h2>
            <Link href="/student/notifications">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2">
                View all
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {notifications.length === 0 && !isLoading && (
              <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-xl border text-xs ${notifTypeColor[n.type] || 'bg-slate-50 border-slate-100 text-slate-600'} ${!n.read ? 'font-semibold' : 'opacity-70'}`}>
                <p className="font-semibold">{n.title}</p>
                <p className="mt-0.5 font-normal opacity-80 line-clamp-1">{n.message}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Library Hours */}
        <LibraryHours accentColor="text-violet-500" headerBg="bg-violet-50" />
      </div>

      {/* Recommendations */}
      {recommendedBooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                {getRecommendationMessage(selectedGenres || user?.preferredGenres || [])}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowGenreModal(true)} className="text-xs text-slate-500 h-7 px-2">
                Update preferences
              </Button>
              <Link href="/student/recommendations">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2">View all</Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recommendedBooks.map((book) => (
              <BookCard key={book.id} book={book} href={`/student/books/${book.id}`} />
            ))}
          </div>
        </div>
      )}

      <GenreSelectionModal
        isOpen={showGenreModal}
        onClose={() => setShowGenreModal(false)}
        onSave={handleGenresSave}
        initialGenres={selectedGenres || user?.preferredGenres}
      />
    </div>
  );
}
