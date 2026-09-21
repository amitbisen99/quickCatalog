import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import InstallPrompt from '@/components/InstallPrompt';
import { AuthProvider } from '@/context/AuthContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { captureAttribution } from '@/utils/attribution';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function App({ Component, pageProps }: AppProps) {
  // Once per full page load — UTM tags only ever arrive on the landing URL,
  // and in-app navigation doesn't remount _app.
  useEffect(() => {
    captureAttribution();
  }, []);

  return (
    <div className={inter.className}>
      <AuthProvider>
        <AdminAuthProvider>
          <Component {...pageProps} />
          <InstallPrompt />
        </AdminAuthProvider>
      </AuthProvider>
    </div>
  );
}
