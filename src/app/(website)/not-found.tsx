import Link from 'next/link';

// NOTE: This component also serves as the ROOT not-found page
// (src/app/not-found.tsx re-exports it), where the (website) layout and its
// ThemeProvider do not run — theme CSS variables then fall back to the light
// :root palette and the page renders white. The styling below is therefore
// deliberately self-contained with the brand's dark hex values, so the 404
// looks identical in both contexts. (The old version also used two utility
// classes that do not exist anywhere — gradient-text / gradient-primary —
// which left the Go Home button with no background at all.)
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1115] px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <h1 className="text-[120px] font-bold font-display leading-none text-gradient-primary md:text-[180px]">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-20 bg-[#E5092F] rounded-full" />
        </div>
        <h2 className="text-2xl font-semibold font-heading text-[#F1F3F5] md:text-3xl">
          Page Not Found
        </h2>
        <p className="max-w-md text-[#9CA3AF]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#E5092F] px-6 py-3 font-medium text-white transition-all hover:bg-[#FF1744] hover:shadow-lg hover:shadow-[#E5092F]/25"
          >
            Go Home
          </Link>
          <Link
            href="/browse/trending"
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2E38] px-6 py-3 font-medium text-[#9CA3AF] transition-all hover:border-[#3A3F4C] hover:text-[#F1F3F5]"
          >
            Browse Series
          </Link>
        </div>
      </div>
    </div>
  );
}
