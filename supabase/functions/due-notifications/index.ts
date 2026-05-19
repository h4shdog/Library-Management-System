// ============================================================
// EDGE FUNCTION: due-notifications
// Purpose: Check for books/ebooks that are due soon (within 12h)
//          or already overdue/expired, and send notifications.
//          Run this on a cron schedule every hour via Supabase.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Prevent duplicate notifications by checking if one was already sent
// for the same request + event type within the last 20 hours
async function alreadyNotified(requestId: string, title: string): Promise<boolean> {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('request_id', requestId)
    .eq('title', title)
    .gte('created_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function sendNotification(
  userId: string,
  requestId: string,
  title: string,
  message: string,
  type: 'warning' | 'error',
) {
  if (await alreadyNotified(requestId, title)) return;
  await supabase.from('notifications').insert({
    user_id:    userId,
    request_id: requestId,
    title,
    message,
    type,
    read: false,
  });
}

Deno.serve(async () => {
  try {
    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    // Fetch all approved requests that have a due date
    const { data: requests, error } = await supabase
      .from('requests')
      .select('id, user_id, book_id, type, due_date, status')
      .eq('status', 'approved')
      .not('due_date', 'is', null);

    if (error) throw error;

    // Fetch book titles for the affected requests
    const bookIds = [...new Set(requests.map((r: any) => r.book_id))];
    const { data: books } = await supabase
      .from('books')
      .select('id, title')
      .in('id', bookIds);

    const bookMap: Record<string, string> = {};
    (books ?? []).forEach((b: any) => { bookMap[b.id] = b.title; });

    let sent = 0;

    for (const req of requests as any[]) {
      const due      = new Date(req.due_date);
      const title    = bookMap[req.book_id] ?? 'a book';
      const isEbook  = req.type === 'ebook_access';
      const isOverdue = due < now;
      const isDueSoon = !isOverdue && due <= in12h;

      if (isOverdue) {
        // Overdue / expired
        const notifTitle   = isEbook ? 'eBook Access Expired' : 'Book Overdue';
        const notifMessage = isEbook
          ? `Your eBook access for "${title}" has expired. Please request access again if you need to continue reading.`
          : `"${title}" was due on ${due.toLocaleDateString()}. Please return it to the library as soon as possible to avoid additional fines.`;

        await sendNotification(req.user_id, req.id, notifTitle, notifMessage, 'error');
        sent++;
      } else if (isDueSoon) {
        // Due within 12 hours
        const hoursLeft    = Math.ceil((due.getTime() - now.getTime()) / (60 * 60 * 1000));
        const notifTitle   = isEbook ? 'eBook Access Expiring Soon' : 'Book Due Soon';
        const notifMessage = isEbook
          ? `Your eBook access for "${title}" expires in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Make sure to finish reading before it expires.`
          : `"${title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Please return it to the library on time.`;

        await sendNotification(req.user_id, req.id, notifTitle, notifMessage, 'warning');
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: requests.length, sent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
