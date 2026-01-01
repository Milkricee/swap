/**
 * Skeleton Loading Components for Wallets
 * - Displays during balance sync (30-60s → <5s with cache)
 * - Smooth transitions from skeleton to real data
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-white/10 rounded-lg ${className}`}
      aria-label="Loading..."
    />
  );
}

export function WalletCardSkeleton() {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="w-24 h-5" />
        </div>
        <Skeleton className="w-16 h-5" />
      </div>

      {/* Balance */}
      <div className="mb-3">
        <Skeleton className="w-32 h-8 mb-1" />
        <Skeleton className="w-20 h-4" />
      </div>

      {/* Address */}
      <div className="flex items-center gap-2 p-2 bg-black/30 rounded">
        <Skeleton className="flex-1 h-4" />
        <Skeleton className="w-4 h-4" />
      </div>
    </div>
  );
}

export function WalletGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <WalletCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Balance Sync Progress Indicator
 */
interface BalanceSyncProgressProps {
  progress: number; // 0-100
  walletId: number;
}

export function BalanceSyncProgress({ progress, walletId }: BalanceSyncProgressProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/50">
      <div className="relative w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-[#00d4aa] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="animate-pulse">
        {progress < 30 ? 'Connecting...' : progress < 80 ? 'Syncing...' : 'Almost done...'}
      </span>
    </div>
  );
}

/**
 * Cached Balance Indicator
 */
interface CachedBadgeProps {
  ageMs: number; // Cache age in milliseconds
}

export function CachedBadge({ ageMs }: CachedBadgeProps) {
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageSeconds = Math.floor((ageMs % 60000) / 1000);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      Cached {ageMinutes > 0 ? `${ageMinutes}m` : `${ageSeconds}s`} ago
    </div>
  );
}
