import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {children}
    </div>
  );
}
