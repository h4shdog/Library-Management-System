// Reusable skeleton shimmer for loading states
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-slate-100 bg-white p-5 rounded-2xl space-y-3 animate-pulse">
      <div className="h-10 w-10 bg-slate-100 rounded-xl" />
      <div className="h-7 w-16 bg-slate-100 rounded-lg" />
      <div className="h-4 w-24 bg-slate-100 rounded-lg" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-6">
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="border border-slate-100 bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-slate-100" style={{ aspectRatio: '3/4' }} />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-100 rounded-lg w-full" />
        <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2 mt-3" />
      </div>
    </div>
  );
}
