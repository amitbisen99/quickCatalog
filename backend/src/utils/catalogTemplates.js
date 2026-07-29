// Single source of truth for which catalog template IDs the public page
// knows how to render. The frontend's template registry
// (frontend/components/catalog-templates/registry.tsx) must stay in sync
// with this list — add a new ID here only once that template component
// actually exists.
const CATALOG_TEMPLATE_IDS = ['modern-grid', 'editorial-spotlight'];

const DEFAULT_CATALOG_TEMPLATE = 'modern-grid';

module.exports = { CATALOG_TEMPLATE_IDS, DEFAULT_CATALOG_TEMPLATE };
