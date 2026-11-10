// Mode gelap otomatis ditangani index.css (.dark .bg-slate-200)
const base = 'bg-slate-200 animate-pulse';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`${base} ${className}`} />;
}

function Header({ withButton = true }: { withButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-28 rounded" />
      {withButton && <Skeleton className="h-9 w-32 rounded-lg" />}
    </div>
  );
}

function Rows({ count = 5, h = 'h-20' }: { count?: number; h?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${h} rounded-xl`} />
      ))}
    </div>
  );
}

const wrap = 'p-4 sm:p-6 space-y-4';

export function DashboardSkeleton() {
  return (
    <div className={wrap}>
      <Skeleton className="h-7 w-32 rounded" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-48 rounded mt-2" />
      <Rows count={3} h="h-16" />
    </div>
  );
}

export function DebtsSkeleton() {
  return (
    <div className={wrap}>
      <Header />
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>
      <Rows count={5} />
    </div>
  );
}

export function PersonsSkeleton() {
  return (
    <div className={wrap}>
      <Header />
      <Skeleton className="h-10 rounded-lg" />
      <Rows count={5} h="h-16" />
    </div>
  );
}

export function PersonDetailSkeleton() {
  return (
    <div className={wrap}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-5 w-40 rounded" />
      <Rows count={3} h="h-16" />
    </div>
  );
}

export function DebtDetailSkeleton() {
  return (
    <div className={wrap}>
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-5 w-44 rounded" />
      <Rows count={2} h="h-14" />
    </div>
  );
}

export function NetworkSkeleton() {
  return (
    <div className={wrap}>
      <Skeleton className="h-7 w-28 rounded" />
      <Skeleton className="h-10 rounded" />
      <Skeleton className="h-80 rounded-2xl" />
      <Rows count={3} h="h-11" />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className={wrap}>
      <Skeleton className="h-7 w-28 rounded" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}