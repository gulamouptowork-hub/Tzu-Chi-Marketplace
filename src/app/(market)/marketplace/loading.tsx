export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-32 rounded-xl bg-sky-strong/60" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-sky" />
        ))}
      </div>
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[4/3] bg-sky" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-1/3 rounded bg-sky" />
                <div className="h-4 w-3/4 rounded bg-sky" />
                <div className="h-4 w-1/2 rounded bg-sky" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
