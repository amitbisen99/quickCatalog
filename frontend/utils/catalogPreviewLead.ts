export type CatalogPreviewLeadStatus = 'new' | 'contacted' | 'delivered' | 'closed';

// Shared between the admin catalog-preview-leads list and detail pages
// so the two never drift on styling/labels for the same status value.
// Matches backend/src/models/CatalogPreviewLead.js's status enum exactly.
export const LEAD_STATUS_STYLES: Record<CatalogPreviewLeadStatus, string> = {
  new: 'bg-amber-50 text-amber-700',
  contacted: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export const LEAD_STATUS_LABEL: Record<CatalogPreviewLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  delivered: 'Preview Delivered',
  closed: 'Closed',
};
