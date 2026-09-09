export interface UserGuideTopic {
  slug: string;
  title: string;
  description: string;
  // YouTube video IDs (the part after youtu.be/ or ?v=) per language.
  video: { en: string; hi: string };
}

// 8 topics covering the core vendor workflow. Every topic points at the
// same 2 placeholder videos for now (per explicit instruction) — swap in
// the real per-topic video IDs once they're recorded, nothing else about
// the page needs to change.
const PLACEHOLDER_VIDEO = { en: 'H4aDBqqcEPc', hi: 'sDMpqW6m4Hg' };

export const USER_GUIDE_TOPICS: UserGuideTopic[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started: Create Your First Catalog',
    description: 'A quick walkthrough of signing up and publishing your very first digital catalog.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'uploading-products',
    title: 'Uploading Products via Excel',
    description: 'Turn a product spreadsheet into a full catalog in minutes, images and all.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'categories-specifications',
    title: 'Managing Categories & Specifications',
    description: 'Organize your products with categories and custom spec fields buyers can filter by.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'branding-design',
    title: 'Customizing Your Catalog Design & Branding',
    description: 'Add your logo, banner, and colors so every catalog looks like your own storefront.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'sharing-catalog',
    title: 'Sharing Your Catalog: Link, QR Code & Embed',
    description: 'Get your catalog in front of buyers — shareable links, a scannable QR code, or embedded on your own site.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'custom-domain',
    title: 'Setting Up Your Custom Domain',
    description: 'Point your own domain or a free branded subdomain at your catalog.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'enquiries-analytics',
    title: 'Tracking Enquiries & Analytics',
    description: 'See who is viewing your catalog and follow up on every buyer enquiry that comes in.',
    video: PLACEHOLDER_VIDEO,
  },
  {
    slug: 'upgrading-plan',
    title: 'Upgrading to the Paid Plan',
    description: 'What you get on the paid plan and how to upgrade when you are ready.',
    video: PLACEHOLDER_VIDEO,
  },
];

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
