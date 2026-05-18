// ============================================================
// API ROUTE: GET /api/ebook/[id]
// Purpose: Verify auth + access, then return a signed URL.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id: bookId } = await params;

    // Get the auth token from the Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: no token' }, { status: 401 });
    }

    // Use service role client for all operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    // Fetch the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('ebook_path, ebook_url, book_type')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: `Book not found: ${bookError?.message}` }, { status: 404 });
    }

    if (book.book_type !== 'ebook' || (!book.ebook_path && !book.ebook_url)) {
      return NextResponse.json({ error: `No ebook file. path=${book.ebook_path}, url=${book.ebook_url}` }, { status: 404 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // Students need an approved, non-expired request
    if (role !== 'admin' && role !== 'staff') {
      const { data: accessRequest, error: reqError } = await supabase
        .from('requests')
        .select('status, due_date')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('type', 'ebook_access')
        .eq('status', 'approved')
        .limit(1)
        .single();

      if (!accessRequest) {
        return NextResponse.json({ error: `Access not approved: ${reqError?.message}` }, { status: 403 });
      }

      if (accessRequest.due_date && new Date(accessRequest.due_date) < new Date()) {
        return NextResponse.json({ error: 'eBook access has expired' }, { status: 403 });
      }
    }

    // Generate signed URL
    if (book.ebook_path) {
      const { data: signed, error: signError } = await supabase.storage
        .from('ebooks')
        .createSignedUrl(book.ebook_path, 3600);

      if (signError || !signed?.signedUrl) {
        return NextResponse.json({ error: `Signed URL failed: ${signError?.message}`, path: book.ebook_path }, { status: 500 });
      }

      return NextResponse.json({ url: signed.signedUrl });
    }

    // Legacy fallback
    return NextResponse.json({ url: book.ebook_url });

  } catch (err) {
    return NextResponse.json({ error: `Server crash: ${err.message}` }, { status: 500 });
  }
}
