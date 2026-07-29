import type { ComponentType } from 'react';
import type { CatalogTemplateProps, CatalogTemplateDetailProps } from '@/types/publicCatalog';
import ModernGridTemplate from './ModernGridTemplate';
import ModernGridDetail from './ModernGridDetail';
import EditorialSpotlightTemplate from './EditorialSpotlightTemplate';

export interface CatalogTemplateOption {
  id: string;
  label: string;
  description: string;
  component: ComponentType<CatalogTemplateProps>;
  detailComponent: ComponentType<CatalogTemplateDetailProps>;
}

// Single source of truth for which templates the public pages can render
// and how they're presented in the vendor-facing picker. Adding a new
// template later is: build the list + detail components, add one entry
// here — both public pages and the picker pick it up automatically.
export const CATALOG_TEMPLATES: CatalogTemplateOption[] = [
  {
    id: 'modern-grid',
    label: 'Modern Grid',
    description: 'Bold hero banner, sticky filters, and a clean product grid with quick-view. Best for catalogs with many products.',
    component: ModernGridTemplate,
    detailComponent: ModernGridDetail,
  },
  {
    id: 'editorial-spotlight',
    label: 'Editorial Spotlight',
    description: 'One striking product per page — a full-bleed photo paired with an elegant description. Best for premium, made-to-order, or attention-grabbing items.',
    component: EditorialSpotlightTemplate,
    detailComponent: ModernGridDetail,
  },
];

export const DEFAULT_TEMPLATE_ID = 'modern-grid';

export function getCatalogTemplate(templateId: string | undefined): CatalogTemplateOption {
  return (
    CATALOG_TEMPLATES.find((t) => t.id === templateId) ||
    CATALOG_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ||
    CATALOG_TEMPLATES[0]
  );
}
