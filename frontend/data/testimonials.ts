export interface Testimonial {
  /** What the customer said, in their own words — no need for quote marks. */
  quote: string;
  /** Full name as they're happy for it to appear publicly. */
  name: string;
  /** Their job title, e.g. "Owner" or "Sales Manager". Optional. */
  role?: string;
  /** Their business name, or a short description of it (e.g. "Furniture Manufacturer — USA"). */
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
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'We used to send PDF catalogues and product images manually to every dealer. With Instant Catalog, our entire product range is available through one link, and customers can send enquiries directly from the catalogue. It has made our sales process much easier.',
    name: 'Michael Carter',
    role: 'Sales Manager',
    business: 'Furniture Manufacturer — USA',
  },
  {
    quote:
      'We had hundreds of products in Excel but no easy way to present them professionally. Instant Catalog turned that product data into something our customers can actually browse. The enquiry feature is especially useful because interested customers can contact us directly from the product catalogue.',
    name: 'Daniel Mokoena',
    role: 'Business Owner',
    business: 'Electrical Wholesaler — USA',
  },
  {
    quote:
      'The biggest improvement for us is that we no longer have multiple versions of our catalogue floating around. We update a product once and our customers always see the latest information.',
    name: 'James Wilson',
    role: 'Director',
    business: 'Hardware Distributor — UK',
  },
  {
    quote:
      'Our sales team can now share our complete product range with customers instantly on WhatsApp. It looks much more professional than sending dozens of product photos.',
    name: 'Ahmed Rahman',
    role: 'Sales Manager',
    business: 'Home Décor Seller — India',
  },
  {
    quote:
      'Updating our catalogue used to be a repetitive job whenever prices or products changed. Now we can keep our entire catalogue updated without redesigning it every time.',
    name: 'Rajiv Sharma',
    role: 'Sales Director',
    business: 'Sanitaryware Manufacturer — India',
  },
];
