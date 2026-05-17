// ============================================================
// SECTION: Imports
// ============================================================

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================================
// SECTION: Utility Functions
// ============================================================

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
