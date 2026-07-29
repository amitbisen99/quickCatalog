import { Playfair_Display } from 'next/font/google';

// Used only by the Editorial Spotlight catalog template's product
// headings — deliberately not applied app-wide (Inter, loaded in
// _app.tsx, remains the default everywhere else).
export const playfairDisplay = Playfair_Display({ subsets: ['latin'], display: 'swap', weight: ['600', '700'] });
