export default function SeriesLoading() {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="skeleton h-8 w-56 rounded-lg" />
          <div className="skeleton mt-2 h-4 w-32 rounded" />
        </div>
        <div className="hidden lg:block skeleton h-10 w-32 rounded-lg" />
      </div>

      {/* Search skeleton */}
      <div className="space-y-3">
        <div className="skeleton h-10 w-full rounded-lg" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-lg" />
          <div className="skeleton h-9 w-24 rounded-lg" />
          <div className="skeleton h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-surface border-b border-border px-5 py-3.5">
          <div className="flex gap-8">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-12 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-14 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-5 px-5 py-3.5">
              <div className="flex items-center gap-3 flex-1">
                <div className="skeleton h-10 w-10 rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-48 rounded mb-1.5" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
              </div>
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-4 w-8 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-6 w-6 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Tablet table skeleton */}
      <div className="hidden md:block lg:hidden rounded-xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="skeleton h-9 w-9 rounded flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-40 rounded mb-1" />
                <div className="skeleton h-3 w-28 rounded" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-14 rounded-full" />
              <div className="skeleton h-4 w-6 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile card skeletons */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <div className="skeleton h-[52px] w-[52px] rounded flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-3/4 rounded mb-1.5" />
                <div className="skeleton h-3 w-1/2 rounded mb-2" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-14 rounded-full" />
                  <div className="skeleton h-4 w-10 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
