export default function SkeletonClient() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-20 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-16 w-full rounded-xl bg-gray-50 dark:bg-gray-800/50" />
        <div className="h-16 w-full rounded-xl bg-gray-50 dark:bg-gray-800/50" />
      </div>
      <div className="flex gap-2 pt-4">
        <div className="h-9 flex-1 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export function SkeletonClientList() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonClient key={i} />
      ))}
    </div>
  );
}
