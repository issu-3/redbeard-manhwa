import { Metadata } from 'next';

// The login page itself is a client component and cannot export metadata,
// so its title lives in this segment layout (login only — /register keeps
// the site default).
export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
