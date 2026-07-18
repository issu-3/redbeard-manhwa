import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <h1 className="text-[120px] font-bold font-display leading-none gradient-text md:text-[180px]">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-20 gradient-primary rounded-full" />
        </div>
        <h2 className="text-2xl font-semibold font-heading text-text-primary md:text-3xl">
          Page Not Found
        </h2>
        <p className="max-w-md text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white gradient-primary transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
          >
            Go Home
          </Link>
          <Link
            href="/browse/trending"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
          >
            Browse Manhwa
          </Link>
        </div>
      </div>
    </div>
  );
}
