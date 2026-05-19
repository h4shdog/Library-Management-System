// ============================================================
// HOOK: useDueNotifications
// Purpose: When called, checks the student's active requests
//          and inserts due-soon / overdue / expired notifications
//          if they haven't been sent yet (deduped by title + request_id).
//
// Triggers:
//   - Book due within 12 hours  → warning "Book Due Soon"
//   - Book overdue              → error   "Book Overdue"
//   - eBook expiring in 12 hrs  → warning "eBook Access Expiring Soon"
//   - eBook expired             → error   "eBook Access Expired"
// ============================================================
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export function useDueNotifications(userId) {
  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      const supabase = createClient();
      const now      = new Date();
      const in12h    = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      // 1. Fetch all approved requests with a due date
      const { data: requests } = await supabase
        .from('requests')
        .select('id, book_id, type, due_date')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .not('due_date', 'is', null);

      if (!requests?.length) return;

      // 2. Fetch book titles
      const bookIds = [...new Set(requests.map((r) => r.book_id))];
      const { data: books } = await supabase
        .from('books')
        .select('id, title')
        .in('id', bookIds);

      const bookMap = {};
      (books ?? []).forEach((b) => { bookMap[b.id] = b.title; });

      // 3. Fetch recent notifications to avoid duplicates (last 20 hours)
      const since = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
      const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('title, request_id')
        .eq('user_id', userId)
        .gte('created_at', since);

      // Build a set of "title|request_id" already sent
      const sent = new Set(
        (recentNotifs ?? []).map((n) => `${n.title}|${n.request_id}`)
      );

      const toInsert = [];

      for (const req of requests) {
        const due     = new Date(req.due_date);
        const title   = bookMap[req.book_id] ?? 'a book';
        const isEbook = req.type === 'ebook_access';

        const isOverdue  = due < now;
        const isDueSoon  = !isOverdue && due <= in12h;

        if (isOverdue) {
          const notifTitle = isEbook ? 'eBook Access Expired' : 'Book Overdue';
          const key        = `${notifTitle}|${req.id}`;
          if (!sent.has(key)) {
            toInsert.push({
              user_id:    userId,
              request_id: req.id,
              title:      notifTitle,
              message:    isEbook
                ? `Your eBook access for "${title}" has expired. Request access again if you need to continue reading.`
                : `"${title}" was due on ${due.toLocaleDateString()}. Please return it to the library as soon as possible to avoid additional fines.`,
              type: 'error',
              read: false,
            });
          }
        } else if (isDueSoon) {
          const hoursLeft  = Math.ceil((due.getTime() - now.getTime()) / (60 * 60 * 1000));
          const notifTitle = isEbook ? 'eBook Access Expiring Soon' : 'Book Due Soon';
          const key        = `${notifTitle}|${req.id}`;
          if (!sent.has(key)) {
            toInsert.push({
              user_id:    userId,
              request_id: req.id,
              title:      notifTitle,
              message:    isEbook
                ? `Your eBook access for "${title}" expires in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Finish reading before it expires.`
                : `"${title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Please return it to the library on time.`,
              type: 'warning',
              read: false,
            });
          }
        }
      }

      if (toInsert.length > 0) {
        await supabase.from('notifications').insert(toInsert);
      }
    };

    run();
  }, [userId]);
}
