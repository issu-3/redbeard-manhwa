import { ThemeProvider } from 'next-themes';
import { NativeInitializer } from '@/components/native/NativeInitializer';
import { NetworkListener } from '@/components/shared/NetworkListener';

export default function AndroidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <NativeInitializer>
        <NetworkListener />
        {children}
      </NativeInitializer>
    </ThemeProvider>
  );
}
