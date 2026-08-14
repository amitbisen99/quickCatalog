import { useState } from 'react';
import { WhatsAppIcon, FacebookIcon, ChatIcon, MailIcon, CopyIcon } from '@/components/icons';

interface Props {
  url: string;
  // Pre-built multi-line message (business name + catalog name + link) —
  // the channels that accept a message body (WhatsApp, SMS, Email) use
  // this; Facebook's sharer doesn't take custom text at all (it reads
  // the page's own Open Graph tags instead), so it only ever gets `url`.
  message: string;
  subject: string;
}

// One shared tile grid for every "share this catalog" surface — the
// catalog detail page's highlighted Share card and the catalogs list
// popup both render this, so the set of channels only needs updating
// in one place.
export default function ShareOptions({ url, message, subject }: Props) {
  const [copied, setCopied] = useState(false);

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
    {
      key: 'email',
      label: 'Email',
      icon: MailIcon,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
    },
  ];

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
      <button type="button" onClick={handleCopyLink} className="flex flex-col items-center gap-1.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <CopyIcon className="h-5 w-5" />
        </span>
        <span className="text-xs font-medium text-gray-700">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </div>
  );
}
