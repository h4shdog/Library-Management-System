// ============================================================
// AI Recommendation Engine v2
//
// Signals used:
//   1. Collaborative filtering  — what similar users borrowed
//   2. Recency-weighted history — recent borrows count more
//   3. Preferred genres         — explicit user preferences
//   4. Tag overlap              — shared tags with past reads
//   5. Trending boost           — popular books right now
//   6. Diversity injection      — prevent all-same-category results
//   7. "New to you" discovery   — genres never borrowed before
//   8. Availability filter      — deprioritize unavailable books
// ============================================================

const NOW = Date.now();
const DAY = 86400000;

/**
 * Decay factor for recency weighting.
 * Books borrowed within 30 days = 1.0, 90 days = 0.5, 180+ days = 0.2
 */
function recencyWeight(dateStr) {
  if (!dateStr) return 0.5;
  const daysAgo = (NOW - new Date(dateStr).getTime()) / DAY;
  if (daysAgo <= 30)  return 1.0;
  if (daysAgo <= 90)  return 0.7;
  if (daysAgo <= 180) return 0.4;
  return 0.2;
}

/**
 * Main recommendation function.
 *
 * @param {object[]} allBooks        - All books (camelCase mapped)
 * @param {string[]} preferredGenres - User's saved genre preferences
 * @param {object[]} borrowingHistory - User's requests (with book_id, created_at, status)
 * @param {object[]} allUsersHistory  - All users' requests for collaborative filtering
 *                                     (pass [] if not available — degrades gracefully)
 * @param {object[]} userRatings      - User's own book ratings [{ book_id, rating }]
 * @param {number}   limit            - Max results
 * @returns {{ book, score, reason, section }[]}
 */
export function getSmartRecommendations(
  allBooks,
  preferredGenres = [],
  borrowingHistory = [],
  allUsersHistory = [],
  userRatings = [],
  limit = 20
) {
  // Guard against non-array inputs
  const safeBooks    = Array.isArray(allBooks)        ? allBooks        : [];
  const safePrefs    = Array.isArray(preferredGenres)  ? preferredGenres  : [];
  const safeHistory  = Array.isArray(borrowingHistory) ? borrowingHistory : [];
  const safeAllHist  = Array.isArray(allUsersHistory)  ? allUsersHistory  : [];
  const safeRatings  = Array.isArray(userRatings)      ? userRatings      : [];

  const borrowedIds  = new Set(safeHistory.map((r) => r.book_id));
  const ratingMap    = Object.fromEntries(safeRatings.map((r) => [r.book_id, r.rating]));

  // ── Build recency-weighted category & tag frequency ──────────
  const categoryWeight = {};
  const tagWeight      = {};

  borrowingHistory.forEach((req) => {
    const book   = allBooks.find((b) => b.id === req.book_id);
    if (!book) return;
    const weight = recencyWeight(req.created_at);
    categoryWeight[book.category] = (categoryWeight[book.category] || 0) + weight;
    (book.tags || []).forEach((tag) => {
      tagWeight[tag] = (tagWeight[tag] || 0) + weight;
    });
  });

  const maxCatW = Math.max(1, ...Object.values(categoryWeight));
  const maxTagW = Math.max(1, ...Object.values(tagWeight));

  // ── Collaborative filtering: category co-occurrence ──────────
  // For each category the user has read, find what OTHER users
  // who also read that category tend to read.
  const collabCategoryBoost = {};
  if (allUsersHistory.length > 0) {
    // Group all history by user
    const byUser = {};
    allUsersHistory.forEach((req) => {
      if (!byUser[req.user_id]) byUser[req.user_id] = [];
      byUser[req.user_id].push(req.book_id);
    });

    // Find users who share at least one borrowed book with current user
    const similarUsers = Object.entries(byUser).filter(([uid, bookIds]) => {
      return bookIds.some((id) => borrowedIds.has(id));
    });

    // Collect categories those similar users read
    similarUsers.forEach(([, bookIds]) => {
      bookIds.forEach((bookId) => {
        if (borrowedIds.has(bookId)) return; // skip already read
        const book = allBooks.find((b) => b.id === bookId);
        if (!book) return;
        collabCategoryBoost[book.category] = (collabCategoryBoost[book.category] || 0) + 1;
      });
    });
  }
  const maxCollab = Math.max(1, ...Object.values(collabCategoryBoost));

  // ── Trending: books borrowed most in last 30 days ─────────────
  const trendingIds = new Set();
  const trendCount  = {};
  const thirtyDaysAgo = NOW - 30 * DAY;
  allUsersHistory.forEach((req) => {
    if (new Date(req.created_at).getTime() > thirtyDaysAgo) {
      trendCount[req.book_id] = (trendCount[req.book_id] || 0) + 1;
    }
  });
  const maxTrend = Math.max(1, ...Object.values(trendCount));
  // Top 20% of trending books
  const trendThreshold = maxTrend * 0.5;
  Object.entries(trendCount).forEach(([id, count]) => {
    if (count >= trendThreshold) trendingIds.add(id);
  });

  // ── Categories the user has NEVER borrowed ────────────────────
  const allCategories    = [...new Set(allBooks.map((b) => b.category))];
  const borrowedCategories = new Set(Object.keys(categoryWeight));
  const newToYouCategories = allCategories.filter((c) => !borrowedCategories.has(c));

  // ── Score every candidate book ────────────────────────────────
  const candidates = allBooks.filter((b) => !b.archived && !borrowedIds.has(b.id));

  const scored = candidates.map((book) => {
    let score = 0;
    const reasons = [];

    // 1. Preferred genres (weight: 35)
    if (preferredGenres.includes(book.category)) {
      score += 35;
      reasons.push(`Matches your preferred genre: ${book.category}`);
    }

    // 2. Recency-weighted history — category (weight: up to 25)
    if (categoryWeight[book.category]) {
      const s = (categoryWeight[book.category] / maxCatW) * 25;
      score += s;
      if (!reasons.length) reasons.push(`Based on your ${book.category} reading history`);
    }

    // 3. Recency-weighted history — tags (weight: up to 15)
    const tagScore = (book.tags || []).reduce((acc, tag) => {
      return acc + ((tagWeight[tag] || 0) / maxTagW) * 15;
    }, 0);
    score += Math.min(tagScore, 15);
    if (tagScore > 5 && !reasons.length) reasons.push('Similar to books you\'ve read');

    // 4. Collaborative filtering (weight: up to 15)
    if (collabCategoryBoost[book.category]) {
      const s = (collabCategoryBoost[book.category] / maxCollab) * 15;
      score += s;
      if (!reasons.length) reasons.push(`Popular among readers like you`);
    }

    // 5. Trending boost (weight: up to 10)
    if (trendCount[book.id]) {
      const s = (trendCount[book.id] / maxTrend) * 10;
      score += s;
      if (trendingIds.has(book.id) && !reasons.length) {
        reasons.push('Trending in the library right now');
      }
    }

    // 6. Book rating (weight: 8)
    score += ((book.rating || 0) / 5) * 8;

    // 7. Availability (weight: 7 if available, -20 if not)
    if (book.availability > 0) {
      score += 7;
    } else {
      score -= 20; // heavily deprioritize unavailable
    }

    // 8. User's own high ratings on similar books boost
    const userRatedSimilar = userRatings.filter((r) => {
      const ratedBook = allBooks.find((b) => b.id === r.book_id);
      return ratedBook?.category === book.category && r.rating >= 4;
    });
    if (userRatedSimilar.length > 0) {
      score += userRatedSimilar.length * 3;
      if (!reasons.length) reasons.push(`You rated similar ${book.category} books highly`);
    }

    const reason  = reasons[0] || `Highly rated ${book.category} book`;
    const section = trendingIds.has(book.id) ? 'trending' : 'foryou';

    return { book, score: Math.round(score), reason, section };
  });

  // ── Diversity injection ───────────────────────────────────────
  // Sort by score, then ensure no more than 40% from same category
  const sortedAll = scored
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score);

  const diversified = [];
  const catCount    = {};
  const maxPerCat   = Math.ceil(limit * 0.4);

  for (const item of sortedAll) {
    const cat = item.book.category;
    if ((catCount[cat] || 0) >= maxPerCat) continue;
    catCount[cat] = (catCount[cat] || 0) + 1;
    diversified.push(item);
    if (diversified.length >= limit) break;
  }

  // Fill remaining slots if diversity cut too many
  if (diversified.length < limit) {
    for (const item of sortedAll) {
      if (!diversified.find((d) => d.book.id === item.book.id)) {
        diversified.push(item);
        if (diversified.length >= limit) break;
      }
    }
  }

  // ── "New to you" section (up to 4 books) ─────────────────────
  const newToYou = [];
  if (newToYouCategories.length > 0 && borrowingHistory.length > 0) {
    for (const cat of newToYouCategories) {
      const best = allBooks
        .filter((b) => !b.archived && !borrowedIds.has(b.id) && b.category === cat && b.availability > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      if (best && !diversified.find((d) => d.book.id === best.id)) {
        newToYou.push({
          book:    best,
          score:   Math.round(((best.rating || 0) / 5) * 60),
          reason:  `Explore a new genre: ${cat}`,
          section: 'newtoyou',
        });
      }
      if (newToYou.length >= 4) break;
    }
  }

  // Fallback: top-rated if nothing scored
  if (diversified.length === 0) {
    const fallback = allBooks
      .filter((b) => !b.archived)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
      .map((book) => ({
        book,
        score:   Math.round(((book.rating || 0) / 5) * 100),
        reason:  'Top rated in our collection',
        section: 'foryou',
      }));
    return [...fallback, ...newToYou];
  }

  return [...diversified, ...newToYou];
}

/**
 * Lightweight version for dashboard preview.
 */
export function getRecommendedBooks(preferredGenres = [], limit = 6, allBooks = []) {
  if (!allBooks.length) return [];
  return getSmartRecommendations(allBooks, preferredGenres, [], [], [], limit).map((r) => r.book);
}

/**
 * Recommendation header message.
 */
export function getRecommendationMessage(genres = []) {
  if (genres.length === 0) return 'Top picks from our collection';
  if (genres.length === 1) return `Top recommendations in ${genres[0]}`;
  return 'Personalized picks based on your interests';
}
