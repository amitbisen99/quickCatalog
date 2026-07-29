import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import InstallPrompt from '@/components/InstallPrompt';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <AuthProvider>
        <Component {...pageProps} />
        <InstallPrompt />
      </AuthProvider>
    </div>
  );
}
