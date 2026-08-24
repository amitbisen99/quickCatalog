import { COUNTRIES, DEFAULT_COUNTRY_CODE } from '@/utils/countries';

interface Props {
  countryCode: string;
  mobileNo: string;
  onCountryCodeChange: (value: string) => void;
  onMobileNoChange: (value: string) => void;
  id?: string;
  error?: string;
  // Signup and Settings use slightly different focus-ring shades
  // (primary-700 vs primary-600) — parameterized rather than forking the
  // whole component so both places share one country list/layout.
  focusClassName?: string;
}

// Shared by signup and the settings profile form so the country picker
// (and which dial code gets paired with the mobile number) lives in one
// place. Every WhatsApp link built from a vendor's mobile number
// elsewhere in the app (see whatsappLink in
// catalog-templates/shared.ts) depends on this pairing being present.
export default function MobileNumberInput({
  countryCode,
  mobileNo,
  onCountryCodeChange,
  onMobileNoChange,
  id = 'mobileNo',
  error,
  focusClassName = 'focus:border-primary-700 focus:ring-primary-700',
}: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        Mobile Number
      </label>
      <div className="mt-1 flex gap-2">
        <select
          aria-label="Country code"
          value={countryCode || DEFAULT_COUNTRY_CODE}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className={`w-32 shrink-0 truncate rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-1 ${focusClassName}`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso2} value={c.dialCode}>
              {c.name} ({c.dialCode})
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          value={mobileNo}
          onChange={(e) => onMobileNoChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="9876543210"
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 ${focusClassName}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
