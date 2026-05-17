# Library Project Structure

## Quick Reference by Role

---

## 🟣 ADMIN ROLE
**Theme:** Purple (`#7C3AED`)
**CSS:** `styles/admin.css`
**Layout:** `components/layout/AdminLayout.jsx`

### Pages (`app/admin/`)
| File | What it does |
|------|-------------|
| `app/admin/layout.jsx` | Wraps all admin pages with AdminLayout |
| `app/admin/dashboard/page.jsx` | Admin home — stats, quick actions, recent activity |
| `app/admin/users/page.jsx` | Manage all users (add, edit, deactivate, export) |
| `app/admin/catalog/page.jsx` | Manage books (add, edit, archive/restore) |
| `app/admin/requests/page.jsx` | View all borrowing requests (read-only overview) |
| `app/admin/reports/page.jsx` | Analytics, charts, export reports |
| `app/admin/settings/page.jsx` | System config (borrowing rules, library name, etc.) |
| `app/admin/profile/page.jsx` | Admin profile edit + password change |

### Components (`components/admin/`)
| File | What it does |
|------|-------------|
| `components/admin/book-modal.jsx` | Add/Edit book modal dialog |
| `components/admin/user-modal.jsx` | Add/Edit user modal dialog |
| `components/admin/export-modal.jsx` | Export data (CSV/PDF) modal |

---

## 🟢 STAFF ROLE
**Theme:** Teal/Green (`#7BA99D`)
**CSS:** `styles/staff.css`
**Layout:** `components/layout/StaffLayout.jsx`

### Pages (`app/staff/`)
| File | What it does |
|------|-------------|
| `app/staff/layout.jsx` | Wraps all staff pages with StaffLayout |
| `app/staff/dashboard/page.jsx` | Staff home — stats, quick actions, recent requests |
| `app/staff/users/page.jsx` | View and manage student accounts |
| `app/staff/catalog/page.jsx` | Manage book inventory (add, edit, delete) |
| `app/staff/requests/page.jsx` | Approve or reject borrowing requests |
| `app/staff/transactions/page.jsx` | View full transaction history |

### Components
> Staff uses shared components — no staff-specific components yet.

---

## 🔵 STUDENT ROLE
**Theme:** Blue (`#6B8DBA`)
**CSS:** `styles/student.css`
**Layout:** `components/layout/StudentLayout.jsx`

### Pages (`app/student/`)
| File | What it does |
|------|-------------|
| `app/student/layout.jsx` | Wraps all student pages with StudentLayout |
| `app/student/dashboard/page.jsx` | Student home — stats, notifications, recommendations |
| `app/student/catalog/page.jsx` | Browse all books with search and filters |
| `app/student/books/[id]/page.jsx` | Individual book detail + borrow/reserve actions |
| `app/student/my-requests/page.jsx` | View and cancel own borrowing requests |
| `app/student/history/page.jsx` | Past borrowing history timeline |
| `app/student/notifications/page.jsx` | Read/dismiss notifications |
| `app/student/recommendations/page.jsx` | AI-powered book recommendations |
| `app/student/profile/page.jsx` | Student profile edit + password change |

### Components (`components/student/`)
| File | What it does |
|------|-------------|
| `components/student/GenreSelectionModal.jsx` | Genre preference picker modal |

---

## 🔐 AUTH (Login)
| File | What it does |
|------|-------------|
| `app/auth/page.jsx` | Auth landing (redirects to login) |
| `app/auth/login/page.jsx` | Login page |
| `components/auth/LoginForm.jsx` | Login form component |

---

## 🧩 SHARED COMPONENTS
| File | What it does |
|------|-------------|
| `components/shared/BookCard.jsx` | Book card used in catalog and recommendations |
| `components/shared/StatusBadge.jsx` | Colored badge for request statuses |

---

## 🏗️ LAYOUT COMPONENTS (`components/layout/`)
| File | What it does |
|------|-------------|
| `AdminLayout.jsx` | Admin shell: sidebar + header for admin pages |
| `StaffLayout.jsx` | Staff shell: sidebar + header for staff pages |
| `StudentLayout.jsx` | Student shell: sidebar + header for student pages |
| `Sidebar.jsx` | Shared sidebar — shows nav items based on user role |
| `Header.jsx` | Shared top header — logo, user menu, logout |

---

## 📦 LIB / UTILITIES (`lib/`)
| File | What it does |
|------|-------------|
| `lib/auth-context.jsx` | Auth state, login/logout, user/book management |
| `lib/mock-data.js` | Demo users, books, requests, notifications |
| `lib/recommendations.js` | AI recommendation logic |
| `lib/types.js` | Shared type definitions |
| `lib/utils.js` | Utility functions (cn, etc.) |

---

## 🎨 STYLES (`styles/`)
| File | What it does |
|------|-------------|
| `styles/admin.css` | Admin purple theme variables and classes |
| `styles/staff.css` | Staff teal/green theme variables and classes |
| `styles/student.css` | Student blue theme variables and classes |
| `styles/globals.css` | Imports all role CSS files |

---

## 🪝 HOOKS (`hooks/`)
| File | What it does |
|------|-------------|
| `hooks/use-mobile.js` | Detects mobile screen size |
| `hooks/use-toast.js` | Toast notification hook |
