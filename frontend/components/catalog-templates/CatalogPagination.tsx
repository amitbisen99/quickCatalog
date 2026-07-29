interface Props {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

// The Previous/Next pager every catalog template shares — kept in one
// place so switching templates never changes this part of the page.
export default function CatalogPagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-sm">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
