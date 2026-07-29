import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures the browser's `beforeinstallprompt` event and exposes it as an
 * on-demand trigger, since the browser only fires it once and only allows
 * `prompt()` to be called from a user gesture.
 *
 * iOS Safari never fires `beforeinstallprompt` (no such API exists there)
 * — `isIOS` lets callers fall back to manual "Share → Add to Home Screen"
 * instructions instead of a native install button.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // iOS Safari has no display-mode media query support for this — it
    // exposes standalone status via the legacy navigator.standalone flag.
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (window.matchMedia('(display-mode: standalone)').matches || iosStandalone) {
      setIsInstalled(true);
    }

    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { isInstallable, isInstalled, isIOS, promptInstall };
}
