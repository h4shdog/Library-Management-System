'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';

const AuthContext = createContext(undefined);

// Single client instance — never recreated
const supabase = createClient();

// ── Mappers ───────────────────────────────────────────────────
const mapProfile = (d) => ({
  id:               d.id,
  email:            d.email,
  name:             d.name,
  role:             d.role,
  avatar:           d.avatar,
  phone:            d.phone,
  address:          d.address,
  joinDate:         d.join_date,
  borrowingLimit:   d.borrowing_limit,
  preferredGenres:  d.preferred_genres || [],
  preferencesSetup: d.preferences_setup,
  status:           d.status,
});

const mapBook = (b, archivedIds = new Set()) => ({
  id:              b.id,
  title:           b.title,
  author:          b.author,
  cover:           b.cover || '',
  rating:          b.rating,
  category:        b.category,
  availability:    b.availability,
  totalCopies:     b.total_copies,
  bookType:        b.book_type,
  description:     b.description,
  publicationDate: b.publication_date,
  publisher:       b.publisher,
  tags:            b.tags || [],
  isbn:            b.isbn,
  archived:        archivedIds.has(b.id),
});

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [allBooks, setAllBooks] = useState([]);

  // Track in-flight requests to avoid duplicate fetches
  const fetchingBooks = useRef(false);
  const fetchingUsers = useRef(false);

  // ── Core loaders ─────────────────────────────────────────────

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single();
    if (!error && data) setUser(mapProfile(data));
  }, []);

  const loadAllBooks = useCallback(async () => {
    if (fetchingBooks.current) return; // skip if already loading
    fetchingBooks.current = true;
    try {
      const [booksRes, archivedRes] = await Promise.all([
        supabase.from('books').select('*'),
        supabase.from('archived_books').select('book_id').is('restored_at', null),
      ]);
      if (booksRes.data) {
        const archivedIds = new Set((archivedRes.data || []).map((r) => r.book_id));
        setAllBooks(booksRes.data.map((b) => mapBook(b, archivedIds)));
      }
    } finally {
      fetchingBooks.current = false;
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    if (fetchingUsers.current) return; // skip if already loading
    fetchingUsers.current = true;
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setAllUsers(data.map(mapProfile));
    } finally {
      fetchingUsers.current = false;
    }
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        loadProfile(session.user.id).finally(() => {
          if (active) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      if (active) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAllUsers([]);
        setAllBooks([]);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) loadProfile(session.user.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Role-based data loading ───────────────────────────────────
  // Students only need books. Staff/admin need both.
  useEffect(() => {
    if (!user?.id) return;

    // Everyone needs books
    loadAllBooks();

    // Only staff and admin need the full user list
    if (user.role === 'staff' || user.role === 'admin') {
      loadAllUsers();
    }
  }, [user?.id, user?.role, loadAllBooks, loadAllUsers]);

  // ── Auth ──────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await loadProfile(data.user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAllUsers([]);
    setAllBooks([]);
  };

  const register = async (email, password, name, role = 'student') => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } },
    });
    if (error) throw new Error(error.message);
    // Don't load profile here — user needs to confirm email first
    // If email confirmation is OFF, data.session will exist and we load profile
    // If email confirmation is ON, data.session is null until they confirm
    if (data.session && data.user) {
      await loadProfile(data.user.id);
    }
  };

  // ── Users ─────────────────────────────────────────────────────

  const addUser = async (newUser) => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email:    newUser.email,
      password: newUser.password || 'ChangeMe123!',
      options:  { data: { name: newUser.name, role: newUser.role } },
    });
    if (signUpError) throw new Error(signUpError.message);

    await new Promise((r) => setTimeout(r, 800));

    const userId = data.user?.id;
    if (userId) {
      const { error: updateError } = await supabase.from('profiles').update({
        name:            newUser.name,
        email:           newUser.email,
        role:            newUser.role,
        phone:           newUser.phone,
        address:         newUser.address,
        status:          newUser.status || 'active',
        borrowing_limit: newUser.borrowingLimit || 5,
        join_date:       newUser.joinDate || new Date().toISOString().split('T')[0],
      }).eq('id', userId);
      if (updateError) throw new Error(updateError.message);
    }

    await loadAllUsers();
  };

  const updateUser = async (updatedUser) => {
    const currentUser = allUsers.find((u) => u.id === updatedUser.id)
      || (user?.id === updatedUser.id ? user : null);

    const { error } = await supabase.from('profiles').update({
      name:              updatedUser.name,
      role:              updatedUser.role,
      phone:             updatedUser.phone,
      address:           updatedUser.address,
      status:            updatedUser.status,
      borrowing_limit:   updatedUser.borrowingLimit,
      preferred_genres:  updatedUser.preferredGenres,
      preferences_setup: updatedUser.preferencesSetup,
      avatar:            updatedUser.avatar,
    }).eq('id', updatedUser.id);
    if (error) throw new Error(error.message);

    // Log deactivation
    if (updatedUser.status === 'deactivated' && currentUser?.status !== 'deactivated') {
      await supabase.from('deactivated_profiles').insert({
        user_id:        updatedUser.id,
        user_name:      updatedUser.name,
        user_email:     updatedUser.email,
        deactivated_by: user?.id,
        deactivated_at: new Date().toISOString(),
      });
    }

    // Log reactivation
    if (updatedUser.status === 'active' && currentUser?.status === 'deactivated') {
      await supabase.from('deactivated_profiles')
        .update({ reactivated_at: new Date().toISOString(), reactivated_by: user?.id })
        .eq('user_id', updatedUser.id)
        .is('reactivated_at', null);
    }

    // Update local state immediately (optimistic) then refresh
    if (user?.id === updatedUser.id) {
      setUser((prev) => ({ ...prev, ...mapProfile({ ...prev, ...updatedUser,
        join_date: updatedUser.joinDate,
        borrowing_limit: updatedUser.borrowingLimit,
        preferred_genres: updatedUser.preferredGenres,
        preferences_setup: updatedUser.preferencesSetup,
      })}));
    }

    // Only reload users list if staff/admin
    if (user?.role === 'staff' || user?.role === 'admin') {
      await loadAllUsers();
    }
  };

  const deleteUser = async (userId) => {
    // Delete the profile directly — auth.users row will be cleaned up by Supabase
    // or can be removed manually from the dashboard if needed.
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw new Error(error.message);

    // Optimistic update — remove from local state immediately
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // ── Books ─────────────────────────────────────────────────────

  const addBook = async (newBook) => {
    const { data, error } = await supabase.from('books').insert({
      title:            newBook.title,
      author:           newBook.author,
      cover:            newBook.cover,
      rating:           newBook.rating,
      category:         newBook.category,
      availability:     newBook.availability,
      total_copies:     newBook.totalCopies,
      book_type:        newBook.bookType,
      description:      newBook.description,
      publication_date: newBook.publicationDate,
      publisher:        newBook.publisher,
      tags:             newBook.tags || [],
      isbn:             newBook.isbn,
    }).select().single();
    if (error) throw new Error(error.message);
    // Optimistic: add to local state immediately
    if (data) setAllBooks((prev) => [...prev, mapBook(data)]);
  };

  const updateBook = async (updatedBook) => {
    const { error } = await supabase.from('books').update({
      title:            updatedBook.title,
      author:           updatedBook.author,
      cover:            updatedBook.cover,
      rating:           updatedBook.rating,
      category:         updatedBook.category,
      availability:     updatedBook.availability,
      total_copies:     updatedBook.totalCopies,
      book_type:        updatedBook.bookType,
      description:      updatedBook.description,
      publication_date: updatedBook.publicationDate,
      publisher:        updatedBook.publisher,
      tags:             updatedBook.tags || [],
      isbn:             updatedBook.isbn,
    }).eq('id', updatedBook.id);
    if (error) throw new Error(error.message);
    // Optimistic update
    setAllBooks((prev) => prev.map((b) => b.id === updatedBook.id ? { ...b, ...updatedBook } : b));
  };

  const archiveBook = async (bookId, reason = '') => {
    const book = allBooks.find((b) => b.id === bookId);
    const { error } = await supabase.from('archived_books').insert({
      book_id:     bookId,
      book_title:  book?.title || '',
      archived_by: user?.id,
      reason,
    });
    if (error) throw new Error(error.message);
    // Optimistic update
    setAllBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, archived: true } : b));
  };

  const restoreBook = async (bookId) => {
    const { error } = await supabase.from('archived_books')
      .update({ restored_at: new Date().toISOString(), restored_by: user?.id })
      .eq('book_id', bookId)
      .is('restored_at', null);
    if (error) throw new Error(error.message);
    // Optimistic update
    setAllBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, archived: false } : b));
  };

  const deleteBook = async (bookId) => {
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) throw new Error(error.message);
    // Optimistic update
    setAllBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user,
      allUsers, allBooks,
      login, logout, register,
      addUser, updateUser, deleteUser,
      addBook, updateBook, deleteBook,
      archiveBook, restoreBook,
      loadAllBooks, loadAllUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
