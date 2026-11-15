export default function WorkspaceLoading() {
  return (
    <div className="space-y-6 flex flex-col h-full animate-pulse">
      {/* Controls Skeleton */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-white/5 rounded-xl" />
          <div className="h-9 w-20 bg-white/5 rounded-xl" />
          <div className="h-9 w-20 bg-white/5 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-48 bg-white/5 rounded-xl" />
          <div className="h-9 w-32 bg-white/10 rounded-xl" />
        </div>
      </div>

      {/* Projects Table Skeleton */}
      <div className="bg-black border border-white/10 rounded-3xl overflow-hidden">
        <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/10">
          <div className="h-4 bg-white/10 rounded-full w-28" />
          <div className="h-4 bg-white/5 rounded-full w-16 hidden sm:block" />
          <div className="h-4 bg-white/5 rounded-full w-24 hidden md:block" />
          <div className="h-4 bg-white/5 rounded-full w-20 hidden lg:block" />
          <div className="h-4 bg-white/5 rounded-full w-16 hidden lg:block" />
          <div className="h-4 bg-white/5 rounded-full w-20 hidden xl:block" />
          <div className="h-4 bg-white/5 rounded-full w-24 hidden sm:block" />
          <div className="h-4 bg-white/5 rounded-full w-16" />
        </div>
        <div className="divide-y divide-white/5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="w-[300px] space-y-2">
                <div className="h-4 bg-white/10 rounded-full w-44" />
                <div className="h-3 bg-white/5 rounded-full w-24" />
              </div>
              <div className="h-6 w-20 bg-white/5 rounded-full shrink-0" />
              <div className="flex -space-x-1 shrink-0 hidden md:flex">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-black" />
                <div className="w-6 h-6 rounded-full bg-white/5 border border-black" />
              </div>
              <div className="h-3.5 bg-white/5 rounded-full w-28 shrink-0 hidden lg:block" />
              <div className="h-5 w-16 bg-white/5 rounded-full shrink-0 hidden lg:block" />
              <div className="flex gap-1 shrink-0 hidden xl:flex">
                <div className="h-5 w-16 bg-white/5 rounded-md" />
              </div>
              <div className="w-24 space-y-1.5 shrink-0 hidden sm:block">
                <div className="h-2 bg-white/5 rounded-full w-full" />
                <div className="h-2.5 bg-white/5 rounded-full w-8" />
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                <div className="w-7 h-7 bg-white/5 rounded-lg" />
                <div className="w-7 h-7 bg-white/5 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
