export interface Testimonial {
  /** What the customer said, in their own words — no need for quote marks. */
  quote: string;
  /** Full name as they're happy for it to appear publicly. */
  name: string;
  /** Their job title, e.g. "Owner" or "Sales Manager". Optional. */
  role?: string;
  /** Their business name. */
  business: string;
  /** 1–5. Leave out to hide the stars. */
  rating?: number;
  /** Path under /public (e.g. "/images/testimonials/priya.webp"). Leave out to show their initials instead. */
  avatar?: string;
}

// Shown in the homepage's Testimonials section (components/Testimonials.tsx),
// which hides itself entirely while this list is empty — so add real
// testimonials only, with the customer's permission to publish them.
// Never invent or paraphrase-into-existence a quote: fabricated reviews
// attributed to real-sounding people are deceptive marketing.
//
// To add one, append an entry:
//   {
//     quote: 'We used to send PDF price lists on WhatsApp. Now customers just open one link.',
//     name: 'Full Name',
//     role: 'Owner',
//     business: 'Business Name',
//     rating: 5,
//   },
export const TESTIMONIALS: Testimonial[] = [];
