'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AVAILABLE_GENRES } from '@/lib/types';

export function GenreSelectionModal({
  isOpen,
  onClose,
  onSave,
  initialGenres = [],
}) {
  const [selectedGenres, setSelectedGenres] = useState(initialGenres);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSave = () => {
    onSave(selectedGenres);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Select Your Preferred Genres</DialogTitle>
          <DialogDescription className="text-base">
            {"Choose the genres you'd like recommendations for. You can always update these later."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Genre Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 font-medium text-center ${
                  selectedGenres.includes(genre)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/40 bg-muted/30 text-foreground hover:border-primary/50'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Selected Count */}
          <div className="text-sm text-muted-foreground">
            {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''} selected
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
