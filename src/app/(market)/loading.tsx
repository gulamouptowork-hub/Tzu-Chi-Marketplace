import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted">
        <LoaderCircle
          className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>Loading / 載入中…</span>
      </div>
      <div
        aria-hidden="true"
        className="space-y-6 animate-pulse motion-reduce:animate-none"
      >
        <div className="h-24 rounded-xl bg-sky" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="card space-y-4 p-4">
              <div className="aspect-[4/3] rounded-lg bg-sky" />
              <div className="h-4 w-3/4 rounded bg-sky" />
              <div className="h-4 w-1/2 rounded bg-sky" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
