export function BattleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/60">
      <div className="skeleton h-32 w-full" />
      <div className="flex flex-col gap-2 p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
