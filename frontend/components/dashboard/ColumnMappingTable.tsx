import { MAPPABLE_FIELDS } from '@/utils/mappableFields';

interface Props {
  headers: string[];
  dataPreview: Record<string, unknown>[];
  fieldMappings: Record<string, string>;
  onChange: (field: string, column: string) => void;
}

const selectClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600';

// Long values (a full product description, a multi-line specifications
// cell) get cut off here rather than blowing out the table's layout —
// the full value is still what gets imported, this is just the preview.
const MAX_SAMPLE_LENGTH = 200;

function truncate(value: string): string {
  return value.length > MAX_SAMPLE_LENGTH ? `${value.slice(0, MAX_SAMPLE_LENGTH)}…` : value;
}

// Some columns (Image URL, Video URL, optional fields in general) are
// often blank on the very first data row even when populated further
// down — checking only dataPreview[0] made an actually-correct mapping
// look broken ("no sample shown"). This scans every previewed row
// (dataPreview is already capped at 5 by the backend) for the first
// non-empty value instead.
function firstSampleValue(dataPreview: Record<string, unknown>[], column: string): string {
  for (const row of dataPreview) {
    const value = String(row[column] ?? '').trim();
    if (value) return value;
  }
  return '';
}

// Shared by both Excel-upload wizards — dashboard/catalogs/create.tsx and
// dashboard/products/bulk-import.tsx. Auto-mapping (fuzzyMapHeaders.ts)
// already guessed a column for each of our fields from the file's
// headers; this lets the vendor see and correct that guess field by
// field, with a live sample value from the file so they can confirm a
// mapping is right without hunting back through the raw sheet.
export default function ColumnMappingTable({ headers, dataPreview, fieldMappings, onChange }: Props) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-44 px-4 py-3">Our Field</th>
              <th className="w-80 px-4 py-3">Column From Your File</th>
              <th className="px-4 py-3">Sample Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MAPPABLE_FIELDS.map((field) => {
              const mappedColumn = fieldMappings[field.key] || '';
              const sample = mappedColumn ? truncate(firstSampleValue(dataPreview, mappedColumn)) : '';
              return (
                <tr key={field.key}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-500" title="Required">
                        *
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={mappedColumn}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="break-words px-4 py-3 text-gray-500">{sample || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
        <span className="text-red-500">*</span> Required fields
      </p>
    </div>
  );
}
