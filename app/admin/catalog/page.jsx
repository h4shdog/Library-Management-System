// ============================================================
// ROLE: Admin | PAGE: Book Catalog Management
// Route: /admin/catalog
// ============================================================
'use client';

import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search, Edit2, Archive, RotateCcw, Plus } from 'lucide-react';
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

export default function AdminCatalogPage() {
  const { allBooks, addBook, updateBook, archiveBook, restoreBook } = useAuth();
  const { toast, ToastContainer } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(undefined);
  const [archiveConfirmation, setArchiveConfirmation] = useState({
    isOpen: false,
    bookId: null,
    bookTitle: '',
    isArchiving: true,
  });

  const filteredBooks = useMemo(() => {
    return allBooks.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.isbn || '').includes(searchQuery);
      const matchesArchiveFilter = showArchived ? book.archived : !book.archived;
      return matchesSearch && matchesArchiveFilter;
    });
  }, [searchQuery, allBooks, showArchived]);

  const handleArchiveClick = (book) => {
    setArchiveConfirmation({
      isOpen: true,
      bookId: book.id,
      bookTitle: book.title,
      isArchiving: !book.archived,
    });
  };

  const handleArchiveConfirm = async () => {
    if (archiveConfirmation.bookId) {
      if (archiveConfirmation.isArchiving) {
        await archiveBook(archiveConfirmation.bookId);
        toast.success(`"${archiveConfirmation.bookTitle}" archived successfully`);
      } else {
        await restoreBook(archiveConfirmation.bookId);
        toast.success(`"${archiveConfirmation.bookTitle}" restored successfully`);
      }
    }
    setArchiveConfirmation({ isOpen: false, bookId: null, bookTitle: '', isArchiving: true });
  };

  const handleOpenAddModal = () => {
    setEditingBook(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleSaveBook = async (book) => {
    if (editingBook) {
      await updateBook(book);
      toast.success(`"${book.title}" updated successfully`);
    } else {
      await addBook(book);
      toast.success(`"${book.title}" added successfully`);
    }
    setIsModalOpen(false);
  };

  return (
    <>
    <div className="min-h-screen bg-[#F3F0FF]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Book Management</h1>
            <p className="text-slate-600 font-medium text-sm mt-1">Manage library catalog and inventory</p>
          </div>
          <Button
            onClick={handleOpenAddModal}
            className="bg-[#7C3AED] hover:bg-[#b594f0] text-white font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Add Book
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <p className="text-2xl font-bold text-[#cbb0f8]">{allBooks.filter((b) => !b.archived).length}</p>
            <p className="text-sm font-bold text-slate-700">Active Books</p>
          </Card>
          <Card className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <p className="text-2xl font-bold text-[#a8c1f7]">{allBooks.filter((b) => !b.archived && b.availability > 0).length}</p>
            <p className="text-sm font-bold text-slate-700">Available Now</p>
          </Card>
          <Card className="border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <p className="text-2xl font-bold text-slate-400">{allBooks.filter((b) => b.archived).length}</p>
            <p className="text-sm font-bold text-slate-700">Archived</p>
          </Card>
        </div>

        <Card className="border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 focus:ring-[#cbb0f8]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#cbb0f8] focus:ring-[#cbb0f8]"
            />
            <span className="text-sm font-semibold text-slate-700">Show archived books</span>
          </label>
        </Card>

        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f6ff] border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Title</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Author</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Genre</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Type</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Available</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Total</th>
                  <th className="text-left py-4 px-6 font-bold text-slate-900">Status</th>
                  <th className="text-right py-4 px-6 font-bold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className={`hover:bg-[#fcfaff] transition-colors ${book.archived ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-6"><p className="font-bold text-slate-900">{book.title}</p></td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{book.author}</td>
                    <td className="py-4 px-6">
                      <Badge className="bg-[#f3f0ff] text-[#cbb0f8] border-none font-bold">{book.category}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={book.bookType === 'ebook' ? 'bg-blue-100 text-blue-700 border-0 font-bold' : 'bg-amber-100 text-amber-700 border-0 font-bold'}>
                        {book.bookType === 'ebook' ? 'eBook' : 'Physical'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6"><span className="font-bold text-slate-900">{book.availability}</span></td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{book.totalCopies}</td>
                    <td className="py-4 px-6">
                      <Badge className={book.archived ? 'bg-red-100 text-red-600 border-0 font-bold' : 'bg-emerald-100 text-emerald-600 border-0 font-bold'}>
                        {book.archived ? 'Archived' : 'Active'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(book)} className="text-[#cbb0f8] hover:bg-[#f3f0ff] font-bold">
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchiveClick(book)}
                          className={book.archived ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}
                        >
                          {book.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <BookModal isOpen={isModalOpen} book={editingBook} onClose={() => setIsModalOpen(false)} onSave={handleSaveBook} />

        <AlertDialog open={archiveConfirmation.isOpen} onOpenChange={(open) => {          if (!open) setArchiveConfirmation({ isOpen: false, bookId: null, bookTitle: '', isArchiving: true });
        }}>
          <AlertDialogContent className="rounded-2xl border-none">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">
                {archiveConfirmation.isArchiving ? 'Archive Book?' : 'Restore Book?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-medium">
                {archiveConfirmation.isArchiving
                  ? `Are you sure you want to archive "${archiveConfirmation.bookTitle}"?`
                  : `Are you sure you want to restore "${archiveConfirmation.bookTitle}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 mt-4">
              <AlertDialogCancel className="flex-1 rounded-xl font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchiveConfirm}
                className={`flex-1 rounded-xl font-bold ${archiveConfirmation.isArchiving ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {archiveConfirmation.isArchiving ? 'Archive' : 'Restore'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
    <ToastContainer />
    </>
  );
}
