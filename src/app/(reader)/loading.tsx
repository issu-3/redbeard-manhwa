import { Loader2 } from 'lucide-react';

export default function MainLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h2 className="mt-4 text-xl font-medium text-text-primary">Loading...</h2>
      <p className="mt-2 text-sm text-text-secondary">Please wait while we load the content.</p>
    </div>
  );
}
