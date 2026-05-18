// ============================================================
// API ROUTE: GET /api/ebook/[id]
// Purpose: Serve a signed, short-lived URL for an ebook PDF.
//          The raw storage path is never exposed to the client.
//          Only authenticated users with an approved ebook_access
//          request (or staff/admin) can access the file.
// ============================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
      },
    }
  );
}

export async function GET(request, { params }) {
  const supabase = createClient();

  // 1. Verify the user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookId = params.id;

  // 2. Fetch the book's storage path and legacy URL (never sent to client)
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('ebook_path, ebook_url, book_type')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  if (book.book_type !== 'ebook' || (!book.ebook_path && !book.ebook_url)) {
    return NextResponse.json({ error: 'No eBook available for this book' }, { status: 404 });
  }

  // 3. Check access: staff/admin bypass; students need an approved, non-expired request
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  if (role !== 'admin' && role !== 'staff') {
    const { data: accessRequest } = await supabase
      .from('requests')
      .select('status, due_date')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('type', 'ebook_access')
      .eq('status', 'approved')
      .limit(1)
      .single();

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access not approved' }, { status: 403 });
    }

    // Check expiry
    if (accessRequest.due_date && new Date(accessRequest.due_date) < new Date()) {
      return NextResponse.json({ error: 'eBook access has expired' }, { status: 403 });
    }
  }

  // 4. Serve the file:
  //    - If uploaded to Supabase Storage → generate a 1-hour signed URL
  //    - If legacy ebook_url exists (old Google/external link) → return it directly
  //      (migrate these books by re-uploading the PDF via the admin panel)
  if (book.ebook_path) {
    const { data: signed, error: signError } = await supabase.storage
      .from('ebooks')
      .createSignedUrl(book.ebook_path, 3600); // 1 hour

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate access link' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  }

  // Legacy fallback — book still has an external URL, not yet migrated
  return NextResponse.json({ url: book.ebook_url });
}
