// Shared shape of the data GET /public/catalog/:slug returns, and the
// props contract every catalog template component renders from. Keep
// this in sync with backend/src/controllers/public.controller.js.

export interface PublicCatalogInfo {
  id: string;
  name: string;
  description?: string;
  slug: string;
  template: string;
}

export interface EnquiryCartItem {
  productId: string;
  name: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  image?: string;
  quantity: number;
}

export interface PublicVendorInfo {
  businessName?: string;
  logo?: string;
  banner?: string;
  mobileNo?: string;
  countryCode?: string;
  currency?: string;
  subscriptionType?: string;
}

export interface PublicCategoryInfo {
  id: string;
  name: string;
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  minimumOrderQuantity?: number;
  images: string[];
  video?: string;
  categoryId?: string;
  specifications?: Record<string, string>;
}

export interface CatalogPageData {
  catalog: PublicCatalogInfo;
  vendor: PublicVendorInfo;
  categories: PublicCategoryInfo[];
  products: PublicProduct[];
}

export interface CatalogProductPageData {
  catalog: PublicCatalogInfo;
  vendor: PublicVendorInfo;
  categories: PublicCategoryInfo[];
  product: PublicProduct;
}

// Every template's list/grid component gets exactly this — swapping
// templates never changes what data is available, only how it's presented.
export type CatalogTemplateProps = CatalogPageData;

// Every template's product detail page component gets exactly this.
export type CatalogTemplateDetailProps = CatalogProductPageData;
