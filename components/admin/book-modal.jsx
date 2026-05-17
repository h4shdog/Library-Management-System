// ============================================================
// COMPONENT: Shared — Book Modal
// Used by: app/admin/catalog/page.jsx, app/staff/catalog/page.jsx
// Purpose: Add or edit a book in the catalog
// theme prop: 'admin' (purple) | 'staff' (emerald)
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, BookOpen, Tablet } from 'lucide-react';

const CATEGORIES = [
  'Fiction', 'Non-fiction', 'Mystery', 'Sci-Fi', 'Romance',
  'Academic', 'Biography', 'Fantasy', 'Thriller', 'Poetry',
];

const emptyForm = {
  title: '',
  author: '',
  category: 'Fiction',
  bookType: 'physical',
  description: '',
  cover: '',
  rating: 4.0,
  availability: 0,
  totalCopies: 0,
  publicationDate: '',
  publisher: '',
  isbn: '',
  tags: [],
};

// Theme tokens — add more roles here as needed
const themes = {
  admin: {
    saveBtn:        'bg-[#cbb0f8] hover:bg-[#b594f0] text-white',
    focusRing:      'focus:ring-[#cbb0f8]',
    selectRing:     'focus:ring-[#cbb0f8]',
    physicalActive: 'border-violet-500 bg-violet-50 text-violet-700',
    ebookActive:    'border-blue-500 bg-blue-50 text-blue-700',
  },
  staff: {
    saveBtn:        'bg-emerald-600 hover:bg-emerald-700 text-white',
    focusRing:      'focus:ring-emerald-400',
    selectRing:     'focus:ring-emerald-400',
    physicalActive: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    ebookActive:    'border-blue-500 bg-blue-50 text-blue-700',
  },
};

export function BookModal({ isOpen, book, onClose, onSave, theme = 'admin' }) {
  const t = themes[theme] || themes.admin;

  const [formData, setFormData] = useState(book || emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Merge book over emptyForm so every field always has a defined value
      setFormData(book ? { ...emptyForm, ...book } : { ...emptyForm });
      setErrors({});
    }
  }, [isOpen, book]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title?.trim())  newErrors.title  = 'Title is required';
    if (!formData.author?.trim()) newErrors.author = 'Author is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      onSave({ ...formData, id: book?.id || `book-${Date.now()}` });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {book ? 'Edit Book' : 'Add New Book'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Title *</label>
            <Input
              value={formData.title ?? ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. The Great Gatsby"
              className={`border-slate-200 ${t.focusRing} ${errors.title ? 'border-red-500' : ''}`}
            />
            {errors.title && <p className="text-xs text-red-500 font-semibold">{errors.title}</p>}
          </div>

          {/* Book Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Book Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('bookType', 'physical')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  formData.bookType !== 'ebook'
                    ? t.physicalActive
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <BookOpen size={16} />
                Physical
              </button>
              <button
                type="button"
                onClick={() => handleChange('bookType', 'ebook')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  formData.bookType === 'ebook'
                    ? t.ebookActive
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Tablet size={16} />
                eBook
              </button>
            </div>
          </div>

          {/* Author + ISBN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Author *</label>
              <Input
                value={formData.author ?? ''}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="e.g. George Orwell"
                className={`border-slate-200 ${t.focusRing} ${errors.author ? 'border-red-500' : ''}`}
              />
              {errors.author && <p className="text-xs text-red-500 font-semibold">{errors.author}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">ISBN</label>
              <Input
                value={formData.isbn ?? ''}
                onChange={(e) => handleChange('isbn', e.target.value)}
                placeholder="e.g. 978-0451524935"
                className={`border-slate-200 ${t.focusRing}`}
              />
            </div>
          </div>

          {/* Publisher + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Publisher</label>
              <Input
                value={formData.publisher ?? ''}
                onChange={(e) => handleChange('publisher', e.target.value)}
                placeholder="e.g. Penguin Books"
                className={`border-slate-200 ${t.focusRing}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Publication Date</label>
              <Input
                type="date"
                value={formData.publicationDate ?? ''}
                onChange={(e) => handleChange('publicationDate', e.target.value)}
                className={`border-slate-200 ${t.focusRing}`}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Category</label>
            <select
              value={formData.category ?? 'Fiction'}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 font-medium focus:ring-2 ${t.selectRing} outline-none`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Available + Total Copies */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Available</label>
              <Input
                type="number"
                value={formData.availability ?? 0}
                onChange={(e) => handleChange('availability', parseInt(e.target.value) || 0)}
                className={`border-slate-200 ${t.focusRing}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Total Copies</label>
              <Input
                type="number"
                value={formData.totalCopies ?? 0}
                onChange={(e) => handleChange('totalCopies', parseInt(e.target.value) || 0)}
                className={`border-slate-200 ${t.focusRing}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the book..."
              className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 font-medium min-h-[80px] focus:ring-2 ${t.selectRing} outline-none resize-none`}
            />
          </div>

          {/* Cover URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Cover Image URL</label>
            <Input
              value={formData.cover ?? ''}
              onChange={(e) => handleChange('cover', e.target.value)}
              placeholder="https://covers.openlibrary.org/..."
              className={`border-slate-200 ${t.focusRing}`}
            />
            {formData.cover && (
              <img
                src={formData.cover}
                alt="Cover preview"
                className="w-12 h-16 object-cover rounded-lg border border-slate-200 mt-1"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* eBook URL — only shown for ebook type */}
          {formData.bookType === 'ebook' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">eBook URL</label>
              <Input
                value={formData.ebookUrl ?? ''}
                onChange={(e) => handleChange('ebookUrl', e.target.value)}
                placeholder="https://drive.google.com/... or any accessible link"
                className={`border-slate-200 ${t.focusRing}`}
              />
              <p className="text-xs text-slate-400">Students will be redirected here after access is approved.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 font-bold shadow-sm ${t.saveBtn}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
