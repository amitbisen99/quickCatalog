export interface UserGuideTopic {
  slug: string;
  title: string;
  description: string;
  // YouTube video IDs (the part after youtu.be/ or ?v=) per language.
  video: { en: string; hi: string };
}

export const USER_GUIDE_TOPICS: UserGuideTopic[] = [
  {
    slug: 'create-catalog-from-excel',
    title: 'Create a Catalog from Excel',
    description:
      'Learn how to import your product data and images from an Excel file and create a professional catalog in just a few steps.',
    video: { en: 'xD1ogq6hs2U', hi: 'vyCzkToLxVY' },
  },
  {
    slug: 'add-products-individually-or-bulk',
    title: 'Add Products Individually or in Bulk',
    description:
      'Learn how to add products one by one or upload multiple products at once using the Excel bulk import option.',
    video: { en: 'l9OxSumKC8I', hi: 'FixEEufaOEI' },
  },
  {
    slug: 'create-catalog-manually',
    title: 'Create a Catalog Manually',
    description:
      'Learn how to create a new catalog and add products manually with descriptions, specifications, images, and pricing.',
    video: { en: 'VvyoxQ0kmvI', hi: 'fLIW0h1C7-A' },
  },
  {
    slug: 'share-catalog-multiple-platforms',
    title: 'Share Your Catalog Across Multiple Platforms',
    description:
      'Learn how to share your catalog through different channels, including direct links, social platforms, QR codes, and more.',
    video: { en: 'Wj9-tfOBYvQ', hi: 'Imr1ifcX4gQ' },
  },
  {
    slug: 'manage-categories-specifications',
    title: 'Manage Product Categories & Specifications',
    description:
      'Learn how to organize your products with categories and create specifications such as size, color, material, and more.',
    video: { en: 'KIiK_ydY25U', hi: 'K9t9sKzCBqM' },
  },
  {
    slug: 'custom-domain-branded-subdomain',
    title: 'Set Up Your Custom Domain & Branded Subdomain',
    description:
      'Learn how to connect your custom domain or create a branded subdomain for a fully white-label catalog experience.',
    video: { en: 'LHpUk8PJOYA', hi: 'sjzh7mYOh-0' },
  },
  {
    slug: 'embed-catalog-on-website',
    title: 'Embed Your Catalog on Your Website',
    description:
      'Learn how to add your catalog to an existing website using a plain link or a customizable floating widget button.',
    video: { en: '1WjqzdjGT8Q', hi: 'P6_ussuF7dM' },
  },
  {
    slug: 'bulk-update-product-prices',
    title: 'Update Product Prices in Bulk',
    description:
      'Learn how to quickly update prices for multiple products at once using percentage-based bulk price adjustments.',
    video: { en: 'YOPaN7FRWIs', hi: 'H_3-QMki_JE' },
  },
];

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
