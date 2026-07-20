import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdSlot } from '@/components/ads/AdSlot';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* H3 FIX: JSON-LD removed — already defined in root layout.tsx */}
      <Header />
      <AdSlot placement="header" />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">{children}</main>
      <AdSlot placement="footer" />
      <Footer />
      <MobileNav />
    </div>
  );
}

