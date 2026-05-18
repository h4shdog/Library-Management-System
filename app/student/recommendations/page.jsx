// ============================================================
// ROLE: Student | PAGE: AI Recommendations
// Route: /student/recommendations
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import { getSmartRecommendations, getRecommendationMessage } from '@/lib/recommendations';
import { BookCard } from '@/components/shared/BookCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Settings, BookOpen, History, Loader, TrendingUp, Compass } from 'lucide-react';
import { GenreSelectionModal } from '@/components/student/GenreSelectionModal';

export default function RecommendationsPage() {
  const { user, updateUser, allBooks } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefs, setPrefs]             = useState(user?.preferredGenres || []);
  const [history, setHistory]         = useState([]);
  const [allHistory, setAllHistory]   = useState([]);
  const [userRatings, setUserRatings] = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    if (user?.preferredGenres) setPrefs(user.preferredGenres);
  }, [user?.preferredGenres]);

  // Fetch all data needed for recommendations
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const fetchAll = async () => {
      setIsLoading(true);
      const [myHistRes, allHistRes, ratingsRes] = await Promise.all([
        // This user's history
        supabase.from('requests').select('book_id, status, created_at').eq('user_id', user.id),
        // All users' history for collaborative filtering
        supabase.from('requests').select('user_id, book_id, created_at').in('status', ['completed', 'returned', 'approved']),
        // This user's ratings
        supabase.from('book_ratings').select('book_id, rating').eq('user_id', user.id),
      ]);
      if (myHistRes.data)  setHistory(myHistRes.data);
      if (allHistRes.data) setAllHistory(allHistRes.data);
      if (ratingsRes.data) setUserRatings(ratingsRes.data);
      setIsLoading(false);
    };

    fetchAll();
  }, [user?.id]);

  // Recompute whenever inputs change
  useEffect(() => {
    if (!allBooks.length) return;
    const results = getSmartRecommendations(allBooks, prefs, history, allHistory, userRatings, 24);
    setRecommended(results);
  }, [allBooks, prefs, history, allHistory, userRatings]);

  const handleSave = async (genres) => {
    // Update prefs immediately and recompute recommendations right away
    setPrefs(genres);
    const results = getSmartRecommendations(allBooks, genres, history, allHistory, userRatings, 24);
    setRecommended(results);
    if (user) await updateUser({ ...user, preferredGenres: genres, preferencesSetup: true });
  };

  // Split into sections
  const forYou    = recommended.filter((r) => r.section === 'foryou');
  const trending  = recommended.filter((r) => r.section === 'trending');
  const newToYou  = recommended.filter((r) => r.section === 'newtoyou');

  const historyCount = new Set(history.map((r) => r.book_id)).size;

  const ScoreBadge = ({ score }) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
      score >= 70 ? 'bg-violet-600' : score >= 40 ? 'bg-blue-500' : 'bg-slate-500'
    }`}>
      {score}% match
    </span>
  );

  const BookGrid = ({ items }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <div key={item.book.id} className="relative group">
          <BookCard book={item.book} href={`/student/books/${item.book.id}`} />
          <div className="absolute top-2 left-2 z-10">
            <ScoreBadge score={item.score} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[10px] px-2 py-1.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity leading-tight">
            {item.reason}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-violet-500" />
            <h1 className="text-2xl font-bold text-slate-900">AI Recommendations</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">{getRecommendationMessage(prefs)}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm" className="border-slate-200 text-slate-600 rounded-xl h-9 gap-2 shrink-0">
          <Settings size={14} /> Preferences
        </Button>
      </div>

      {/* Preference tags */}
      {prefs.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400">Your genres:</span>
          {prefs.map((g) => (
            <Badge key={g} className="bg-violet-100 text-violet-700 border-0 text-xs">{g}</Badge>
          ))}
        </div>
      )}

      {/* How it works */}
      <Card className="border border-violet-100 bg-violet-50 p-4 rounded-2xl">
        <div className="flex items-start gap-3">
          <Sparkles size={16} className="text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-900">How recommendations work</p>
            <p className="text-xs text-violet-600 mt-1 leading-relaxed">
              Scores combine your genre preferences, recency-weighted borrowing history, collaborative filtering from similar readers, trending books, and your own ratings.
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-violet-700">
                <BookOpen size={12} />
                <span><strong>{prefs.length}</strong> preferred genres</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-violet-700">
                <History size={12} />
                <span><strong>{historyCount}</strong> books in history</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-violet-700">
                <Sparkles size={12} />
                <span><strong>{userRatings.length}</strong> books rated</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin text-slate-300" />
        </div>
      )}

      {/* ── For You section ── */}
      {!isLoading && forYou.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            <h2 className="text-sm font-bold text-slate-900">For You</h2>
            <span className="text-xs text-slate-400">({forYou.length})</span>
          </div>
          <BookGrid items={forYou} />
        </div>
      )}

      {/* ── Trending section ── */}
      {!isLoading && trending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Trending Now</h2>
            <span className="text-xs text-slate-400">Popular in the library this month</span>
          </div>
          <BookGrid items={trending} />
        </div>
      )}

      {/* ── New to You section ── */}
      {!isLoading && newToYou.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900">Explore New Genres</h2>
            <span className="text-xs text-slate-400">Genres you haven't tried yet</span>
          </div>
          <BookGrid items={newToYou} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && recommended.length === 0 && (
        <Card className="border border-slate-100 bg-white p-12 rounded-2xl text-center">
          <Sparkles size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-700">No recommendations yet</p>
          <p className="text-xs text-slate-400 mt-1">Set your genre preferences or borrow some books to get personalized suggestions</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 px-4 rounded-lg">
            Set Preferences
          </Button>
        </Card>
      )}

      <GenreSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialGenres={prefs} />
    </div>
  );
}
