import { useState } from 'react';
import { WhatsAppIcon, FacebookIcon, ChatIcon, MailIcon, CopyIcon, ChevronDownIcon } from '@/components/icons';

interface Props {
  url: string;
  // Pre-built multi-line message (business name + catalog name + link) —
  // the channels that accept a message body (WhatsApp, SMS, Email) use
  // this; Facebook's sharer doesn't take custom text at all (it reads
  // the page's own Open Graph tags instead), so it only ever gets `url`.
  message: string;
  subject: string;
}

// A plain mailto: link hands off to whatever the OS has registered as
// the default mail handler — on most Windows machines that's a "New
// Outlook" the vendor's never signed into, which either opens a
// half-configured Outlook window or an app-picker dialog. Neither is
// usable, and there's no way for a webpage to detect which webmail a
// vendor is actually logged into (browsers don't expose that, for good
// reason) to route them there automatically. The fix every other "share
// via email" widget uses: let the vendor pick their own provider once —
// each of these has its own web compose URL that opens directly in a
// browser tab, bypassing the OS entirely. mailto: stays as the last
// option, for anyone on a real desktop client (Apple Mail, Thunderbird).
function emailProviderLinks(subject: string, message: string) {
  const su = encodeURIComponent(subject);
  const body = encodeURIComponent(message);
  return [
    { key: 'gmail', label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${body}`, external: true },
    { key: 'outlook', label: 'Outlook.com', href: `https://outlook.live.com/mail/0/deeplink/compose?subject=${su}&body=${body}`, external: true },
    { key: 'yahoo', label: 'Yahoo Mail', href: `https://compose.mail.yahoo.com/?subject=${su}&body=${body}`, external: true },
    { key: 'mailto', label: 'Desktop App', href: `mailto:?subject=${su}&body=${body}`, external: false },
  ];
}

// One shared tile grid for every "share this catalog" surface — the
// catalog detail page's highlighted Share card and the catalogs list
// popup both render this, so the set of channels only needs updating
// in one place.
export default function ShareOptions({ url, message, subject }: Props) {
  const [copied, setCopied] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const links: {
    key: string;
    label: string;
    icon: typeof WhatsAppIcon;
    iconBg: string;
    iconColor: string;
    href: string;
  }[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: WhatsAppIcon,
      iconBg: 'bg-[#25D366]',
      iconColor: 'text-white',
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: FacebookIcon,
      iconBg: 'bg-[#1877F2]',
      iconColor: 'text-white',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: 'sms',
      label: 'SMS',
      icon: ChatIcon,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      href: `sms:?body=${encodeURIComponent(message)}`,
    },
  ];

  const emailOptions = emailProviderLinks(subject, message);

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target={link.key === 'whatsapp' || link.key === 'facebook' ? '_blank' : undefined}
          rel="noreferrer"
          className="flex flex-col items-center gap-1.5"
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${link.iconBg} ${link.iconColor}`}>
            <link.icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium text-gray-700">{link.label}</span>
        </a>
      ))}

      <div className="relative flex flex-col items-center">
        <button type="button" onClick={() => setEmailMenuOpen((open) => !open)} className="flex flex-col items-center gap-1.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <MailIcon className="h-5 w-5" />
          </span>
          <span className="flex items-center gap-0.5 text-xs font-medium text-gray-700">
            Email
            <ChevronDownIcon className={`h-3 w-3 text-gray-400 transition-transform ${emailMenuOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {emailMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setEmailMenuOpen(false)} />
            <div className="absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {emailOptions.map((option) => (
                <a
                  key={option.key}
                  href={option.href}
                  target={option.external ? '_blank' : undefined}
                  rel="noreferrer"
                  onClick={() => setEmailMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {option.label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      <button type="button" onClick={handleCopyLink} className="flex flex-col items-center gap-1.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <CopyIcon className="h-5 w-5" />
        </span>
        <span className="text-xs font-medium text-gray-700">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </div>
  );
}
