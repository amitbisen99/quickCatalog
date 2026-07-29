import type { PublicCategoryInfo } from '@/types/publicCatalog';

interface Props {
  categories: PublicCategoryInfo[];
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
}

// The sticky search + category-filter row every catalog template shares —
// kept in one place so switching templates never changes this part of the
// page. Category selection resets the caller's page via onSearchChange /
// onCategoryChange (both callbacks are expected to also reset pagination).
export default function CatalogFilterBar({ categories, search, onSearchChange, categoryFilter, onCategoryChange }: Props) {
  // Keep the filter row short — the first 3 categories stay one tap away,
  // the rest move into a dropdown instead of wrapping into extra rows.
  const visibleCategories = categories.slice(0, 3);
  const overflowCategories = categories.slice(3);

  return (
    <div className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products…"
            className="w-full border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              onClick={() => onCategoryChange('')}
              className={`shrink-0 px-3.5 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === '' ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => onCategoryChange(c.id)}
                className={`shrink-0 px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === c.id ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
            {overflowCategories.length > 0 && (
              <select
                value={overflowCategories.some((c) => c.id === categoryFilter) ? categoryFilter : ''}
                onChange={(e) => {
                  if (e.target.value) onCategoryChange(e.target.value);
                }}
                className={`shrink-0 border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-primary-600 ${
                  overflowCategories.some((c) => c.id === categoryFilter)
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              >
                <option value="">More…</option>
                {overflowCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
