import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdRenderer } from '@/components/ads/AdRenderer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col has-[#series-action-bar]:pb-[72px] md:has-[#series-action-bar]:pb-0">
      {/* H3 FIX: JSON-LD removed — already defined in root layout.tsx */}
      <Header />
      <main id="main-content" className="flex-1 flex flex-col">{children}</main>
      <AdRenderer placement="footer" />
      <Footer />
      <MobileNav />
      {/* Global spacer for MobileNav to prevent content from hiding behind it */}
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:hidden shrink-0" />
    </div>
  );
}
