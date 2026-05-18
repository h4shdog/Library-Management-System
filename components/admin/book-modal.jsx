// ============================================================
// COMPONENT: Shared — Book Modal
// Used by: app/admin/catalog/page.jsx, app/staff/catalog/page.jsx
// Purpose: Add or edit a book in the catalog
// theme prop: 'admin' (purple) | 'staff' (emerald)
// ============================================================
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, BookOpen, Tablet, Upload, FileText, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

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
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Merge book over emptyForm so every field always has a defined value
      setFormData(book ? { ...emptyForm, ...book } : { ...emptyForm });
      setErrors({});
      setPdfFile(null);
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
    if (!formData.title?.trim())           newErrors.title           = 'Title is required';
    if (!formData.author?.trim())          newErrors.author          = 'Author is required';
    if (!formData.isbn?.trim())            newErrors.isbn            = 'ISBN is required';
    if (!formData.publisher?.trim())       newErrors.publisher       = 'Publisher is required';
    if (!formData.publicationDate?.trim()) newErrors.publicationDate = 'Publication date is required';
    if (!formData.description?.trim())     newErrors.description     = 'Description is required';
    if (!formData.cover?.trim())           newErrors.cover           = 'Cover image URL is required';
    if (!formData.totalCopies || formData.totalCopies < 1)
                                           newErrors.totalCopies     = 'Total copies must be at least 1';
    if (formData.availability < 0 || formData.availability > formData.totalCopies)
                                           newErrors.availability    = 'Available copies cannot exceed total copies';
    // For ebooks: require either an existing stored path or a new file being uploaded
    if (formData.bookType === 'ebook' && !formData.ebookPath && !pdfFile)
                                           newErrors.ebookFile       = 'Please upload a PDF file for this eBook';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePdfSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, ebookFile: 'Only PDF files are allowed' }));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, ebookFile: 'File size must be under 50 MB' }));
      return;
    }
    setPdfFile(file);
    setErrors((prev) => { const n = { ...prev }; delete n.ebookFile; return n; });
  };

  const uploadPdf = async (bookId) => {
    if (!pdfFile) return formData.ebookPath || null;
    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = pdfFile.name.split('.').pop();
      const path = `${bookId}.${ext}`;

      // Remove old file if replacing
      if (formData.ebookPath) {
        await supabase.storage.from('ebooks').remove([formData.ebookPath]);
      }

      const { error } = await supabase.storage
        .from('ebooks')
        .upload(path, pdfFile, { upsert: true, contentType: 'application/pdf' });

      if (error) throw new Error(error.message);
      return path;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const bookId = book?.id || `book-${Date.now()}`;
      const ebookPath = formData.bookType === 'ebook' ? await uploadPdf(bookId) : null;
      onSave({ ...formData, id: bookId, ebookPath, ebookUrl: null });
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

          {/* Validation summary */}
          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <span className="text-red-500 font-bold text-sm shrink-0">!</span>
              <p className="text-xs text-red-600 font-semibold">
                Please fill in all required fields before saving.
              </p>
            </div>
          )}

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
              <label className="text-sm font-bold text-slate-700">ISBN *</label>
              <Input
                value={formData.isbn ?? ''}
                onChange={(e) => handleChange('isbn', e.target.value)}
                placeholder="e.g. 978-0451524935"
                className={`border-slate-200 ${t.focusRing} ${errors.isbn ? 'border-red-500' : ''}`}
              />
              {errors.isbn && <p className="text-xs text-red-500 font-semibold">{errors.isbn}</p>}
            </div>
          </div>

          {/* Publisher + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Publisher *</label>
              <Input
                value={formData.publisher ?? ''}
                onChange={(e) => handleChange('publisher', e.target.value)}
                placeholder="e.g. Penguin Books"
                className={`border-slate-200 ${t.focusRing} ${errors.publisher ? 'border-red-500' : ''}`}
              />
              {errors.publisher && <p className="text-xs text-red-500 font-semibold">{errors.publisher}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Publication Date *</label>
              <Input
                type="date"
                value={formData.publicationDate ?? ''}
                onChange={(e) => handleChange('publicationDate', e.target.value)}
                className={`border-slate-200 ${t.focusRing} ${errors.publicationDate ? 'border-red-500' : ''}`}
              />
              {errors.publicationDate && <p className="text-xs text-red-500 font-semibold">{errors.publicationDate}</p>}
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
              <label className="text-sm font-bold text-slate-700">Available *</label>
              <Input
                type="number"
                min="0"
                value={formData.availability ?? 0}
                onChange={(e) => handleChange('availability', parseInt(e.target.value) || 0)}
                className={`border-slate-200 ${t.focusRing} ${errors.availability ? 'border-red-500' : ''}`}
              />
              {errors.availability && <p className="text-xs text-red-500 font-semibold">{errors.availability}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Total Copies *</label>
              <Input
                type="number"
                min="1"
                value={formData.totalCopies ?? 0}
                onChange={(e) => handleChange('totalCopies', parseInt(e.target.value) || 0)}
                className={`border-slate-200 ${t.focusRing} ${errors.totalCopies ? 'border-red-500' : ''}`}
              />
              {errors.totalCopies && <p className="text-xs text-red-500 font-semibold">{errors.totalCopies}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description *</label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the book..."
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 font-medium min-h-[80px] focus:ring-2 ${t.selectRing} outline-none resize-none ${errors.description ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.description && <p className="text-xs text-red-500 font-semibold">{errors.description}</p>}
          </div>

          {/* Cover URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Cover Image URL *</label>
            <Input
              value={formData.cover ?? ''}
              onChange={(e) => handleChange('cover', e.target.value)}
              placeholder="https://covers.openlibrary.org/..."
              className={`border-slate-200 ${t.focusRing} ${errors.cover ? 'border-red-500' : ''}`}
            />
            {errors.cover && <p className="text-xs text-red-500 font-semibold">{errors.cover}</p>}
            {formData.cover && (
              <img
                src={formData.cover}
                alt="Cover preview"
                className="w-12 h-16 object-cover rounded-lg border border-slate-200 mt-1"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* eBook File Upload — only shown for ebook type */}
          {formData.bookType === 'ebook' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">eBook PDF *</label>

              {/* Show existing file info when editing */}
              {formData.ebookPath && !pdfFile && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <FileText size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-slate-600 font-medium truncate flex-1">
                    Current file: {formData.ebookPath.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 font-semibold hover:underline shrink-0"
                  >
                    Replace
                  </button>
                </div>
              )}

              {/* New file selected */}
              {pdfFile && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <FileText size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate flex-1">{pdfFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Upload button — shown when no file selected yet (and no existing path) */}
              {!pdfFile && !formData.ebookPath && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-colors
                    ${errors.ebookFile ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Click to upload PDF</span>
                  <span className="text-xs text-slate-400">Max 50 MB</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfSelect}
              />

              {errors.ebookFile
                ? <p className="text-xs text-red-500 font-semibold">{errors.ebookFile}</p>
                : <p className="text-xs text-slate-400">PDF will be stored securely. Students access it only after approval.</p>
              }
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
            disabled={isSaving || isUploading}
            className={`flex-1 font-bold shadow-sm ${t.saveBtn}`}
          >
            {isUploading ? (
              <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Uploading...</span>
            ) : isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
