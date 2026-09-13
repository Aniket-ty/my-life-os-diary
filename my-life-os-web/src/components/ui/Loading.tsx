export function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-violet-brand" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-violet-brand" />
        </div>
      </div>
    </div>
  )
}

export function Skeleton() {
  return <div className="shimmer h-40 rounded-2xl" />
}