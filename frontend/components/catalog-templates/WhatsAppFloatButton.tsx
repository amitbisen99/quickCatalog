interface Props {
  link: string;
}

// The floating WhatsApp enquiry button every catalog template shares —
// kept in one place so switching templates never changes this part of
// the page. Renders nothing if the vendor has no mobile number on file.
export default function WhatsAppFloatButton({ link }: Props) {
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Enquire on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36c1.35.71 2.9 1.12 4.53 1.12h.01c5.46 0 9.91-4.45 9.91-9.91C21.87 6.45 17.5 2 12.04 2zm5.79 14.06c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.11.1-1.79-.11-.41-.13-.94-.3-1.62-.6-2.84-1.23-4.7-4.1-4.84-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09 1-2.37c.26-.29.57-.36.76-.36h.55c.18 0 .42-.02.64.5.24.58.81 2 .88 2.15.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.19-.28.37-.23.62-.14.26.09 1.64.77 1.92.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z" />
      </svg>
    </a>
  );
}
