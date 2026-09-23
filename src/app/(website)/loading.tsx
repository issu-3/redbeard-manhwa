export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl gradient-primary animate-pulse" />
          <div className="absolute inset-0 h-16 w-16 rounded-2xl gradient-primary opacity-50 blur-xl" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold font-heading gradient-text">
            REDBEARD
          </h2>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-card">
            <div className="h-full w-1/3 rounded-full gradient-primary animate-[slide-loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
