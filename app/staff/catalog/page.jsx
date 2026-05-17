// ============================================================
// ROLE: Staff | PAGE: Book Catalog Management
// Route: /staff/catalog
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search, Edit2, Plus, BookOpen, Archive, RotateCcw } from 'lucide-react';
import { BookModal } from '@/components/admin/book-modal';
import { useToast } from '@/components/shared/Toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StaffCatalogPage() {
  const { allBooks, addBook, updateBook, archiveBook, restoreBook } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [searchQuery, setSearchQuery]   = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingBook, setEditingBook]   = useState(undefined);
  const [archiveConfirm, setArchiveConfirm] = useState({ isOpen: false, bookId: null, bookTitle: '', isArchiving: true });

  const books = useMemo(
    () => allBooks.filter((b) => showArchived ? b.archived : !b.archived),
    [allBooks, showArchived]
  );

  const filtered = useMemo(() => books.filter(
    (b) => b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           b.author.toLowerCase().includes(searchQuery.toLowerCase())
  ), [searchQuery, books]);

  const openAdd = () => { setEditingBook(undefined); setIsModalOpen(true); };
  const openEdit = (book) => { setEditingBook(book); setIsModalOpen(true); };

  const handleSave = async (book) => {
    if (editingBook) {
      await updateBook(book);
      toast.success(`"${book.title}" updated successfully`);
    } else {
      await addBook(book);
      toast.success(`"${book.title}" added successfully`);
    }
    setIsModalOpen(false);
  };

  const handleArchiveClick = (book) =>
    setArchiveConfirm({ isOpen: true, bookId: book.id, bookTitle: book.title, isArchiving: !book.archived });

  const handleArchiveConfirm = async () => {
    if (archiveConfirm.isArchiving) {
      await archiveBook(archiveConfirm.bookId);
      toast.success(`"${archiveConfirm.bookTitle}" archived successfully`);
    } else {
      await restoreBook(archiveConfirm.bookId);
      toast.success(`"${archiveConfirm.bookTitle}" restored successfully`);
    }
    setArchiveConfirm({ isOpen: false, bookId: null, bookTitle: '', isArchiving: true });
  };

  const activeCount   = allBooks.filter((b) => !b.archived).length;
  const archivedCount = allBooks.filter((b) =>  b.archived).length;

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalog Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage book inventory</p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 gap-2 text-sm">
          <Plus size={15} /> Add Book
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Books',     value: activeCount,                                        color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Available Copies', value: allBooks.filter((b) => !b.archived).reduce((s, b) => s + b.availability, 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Copies',     value: allBooks.filter((b) => !b.archived).reduce((s, b) => s + b.totalCopies, 0),  color: 'text-slate-600',   bg: 'bg-slate-50' },
          { label: 'Archived',         value: archivedCount,                                      color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map((s, i) => (
          <Card key={i} className={`border border-slate-100 ${s.bg} p-5 rounded-2xl`}>
            <BookOpen size={18} className={`${s.color} mb-3`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search + archive toggle */}
      <Card className="border border-slate-100 bg-white p-4 rounded-2xl space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search books…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 rounded-xl text-sm"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
          />
          <span className="text-sm font-semibold text-slate-600">Show archived books</span>
        </label>
      </Card>

      {/* Table */}
      <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Title', 'Author', 'Category', 'Type', 'Available', 'Total', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((book) => (
                <tr key={book.id} className={`hover:bg-slate-50 transition-colors ${book.archived ? 'opacity-60' : ''}`}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={book.cover || 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=32&h=40&fit=crop'}
                        className="w-8 h-10 rounded-lg object-cover shrink-0"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507842217343-583f7270bfda?w=32&h=40&fit=crop'; }}
                      />
                      <span className="text-sm font-semibold text-slate-900 line-clamp-1">{book.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-sm text-slate-600">{book.author}</td>
                  <td className="py-3.5 px-5">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{book.category}</Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <Badge className={book.bookType === 'ebook'
                      ? 'bg-blue-100 text-blue-700 border-0 text-xs'
                      : 'bg-amber-100 text-amber-700 border-0 text-xs'
                    }>
                      {book.bookType === 'ebook' ? 'eBook' : 'Physical'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-sm font-bold ${book.availability > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {book.availability}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-sm text-slate-500">{book.totalCopies}</td>
                  <td className="py-3.5 px-5">
                    <Badge className={book.archived
                      ? 'bg-red-100 text-red-600 border-0 text-xs font-bold'
                      : 'bg-emerald-100 text-emerald-600 border-0 text-xs font-bold'
                    }>
                      {book.archived ? 'Archived' : 'Active'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(book)}
                        className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchiveClick(book)}
                        className={book.archived
                          ? 'h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 rounded-lg'
                          : 'h-7 w-7 p-0 text-amber-500 hover:bg-amber-50 rounded-lg'}
                        title={book.archived ? 'Restore' : 'Archive'}
                      >
                        {book.archived ? <RotateCcw size={13} /> : <Archive size={13} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                    No books found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <BookModal
        isOpen={isModalOpen}
        book={editingBook}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        theme="staff"
      />

      {/* Archive / Restore confirmation */}
      <AlertDialog
        open={archiveConfirm.isOpen}
        onOpenChange={(open) => !open && setArchiveConfirm({ isOpen: false, bookId: null, bookTitle: '', isArchiving: true })}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              {archiveConfirm.isArchiving ? 'Archive Book?' : 'Restore Book?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              {archiveConfirm.isArchiving
                ? `"${archiveConfirm.bookTitle}" will be hidden from the catalog. You can restore it later.`
                : `"${archiveConfirm.bookTitle}" will be made active and visible in the catalog again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              className={`flex-1 rounded-xl font-semibold ${
                archiveConfirm.isArchiving
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {archiveConfirm.isArchiving ? 'Archive' : 'Restore'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    <ToastContainer />
    </>
  );
}
