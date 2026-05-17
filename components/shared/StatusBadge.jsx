// ============================================================
// COMPONENT: Shared — Status Badge
// Used by: staff requests, staff transactions, student my-requests, admin requests
// Purpose: Colored badge for pending/approved/rejected/completed status
// ============================================================
'use client';

import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status, className = '' }) {
  const statusConfig = {
    pending: {
      bg: '#F4E4A6',
      text: '#8B7F3D',
      label: 'Pending',
    },
    approved: {
      bg: '#A8D5BA',
      text: '#4A6D55',
      label: 'Approved',
    },
    rejected: {
      bg: '#E8A8A8',
      text: '#8B5555',
      label: 'Rejected',
    },
    completed: {
      bg: '#A8D5BA',
      text: '#4A6D55',
      label: 'Completed',
    },
    returned: {
      bg: '#D4C5B9',
      text: '#6B6055',
      label: 'Returned',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      className={`${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.bg,
      }}
    >
      {config.label}
    </Badge>
  );
}
