import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const DISMISSED_KEY = 'qc_install_prompt_dismissed';

// iOS Safari's share-sheet glyph — used only here to point at the actual
// button, since "Add to Home Screen" lives inside it and isn't otherwise
// discoverable.
function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export default function InstallPrompt() {
  const router = useRouter();
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  // This is the vendor's install prompt for the dashboard app — only
  // relevant on the login screen and inside the vendor dashboard itself.
  // Everywhere else (marketing site, signup/verify, admin panel, public
  // catalog pages) isn't "using Instant Catalog" as an app yet.
  const onVendorAppPage = router.pathname === '/login' || router.pathname.startsWith('/dashboard');
  const showIOSInstructions = isIOS && !isInstalled && !isInstallable;

  if (!onVendorAppPage || isInstalled || dismissed || !(isInstallable || showIOSInstructions)) return null;

  // /dashboard/* pages render a fixed bottom tab bar on mobile
  // (DashboardLayout) — sit above it there instead of flush with the
  // screen edge, where it would overlap. /login has no tab bar, so
  // bottom-0 is correct there.
  const onDashboard = router.pathname.startsWith('/dashboard');

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  return (
    <div
      className={`fixed inset-x-0 z-50 flex flex-col gap-3 border-t border-gray-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-80 sm:rounded-xl sm:border ${
        onDashboard ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]' : 'bottom-0'
      }`}
    >
      {showIOSInstructions ? (
        <>
          <div>
            <p className="text-sm font-semibold text-gray-900">Install Instant Catalog</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              Tap <ShareGlyph /> Share, then &quot;Add to Home Screen&quot;.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Got it
          </button>
        </>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold text-gray-900">Install Instant Catalog</p>
            <p className="text-sm text-gray-600">
              Add Instant Catalog to your home screen for quick access, even offline.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={install}
              className="flex-1 rounded-lg bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
