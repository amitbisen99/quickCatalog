import { useState } from 'react';
import Modal from '@/components/Modal';
import { CodeIcon, CopyIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { getCatalogPublicUrl } from '@/utils/catalogUrl';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010';
const DEFAULT_COLOR = '#232153'; // primary-700 — matches the app's own buttons

const POSITIONS = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
];

interface Props {
  catalog: { slug: string; name: string };
}

function buildLinkSnippet(url: string, text: string, color: string): string {
  const style =
    `display:inline-block;padding:12px 24px;background-color:${color};color:#ffffff;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;` +
    `font-weight:600;text-decoration:none;border-radius:9999px;`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="${style}">${text}</a>`;
}

function buildWidgetSnippet(
  url: string,
  text: string,
  color: string,
  position: string,
  mode: string
): string {
  return (
    `<script src="${APP_URL}/widget.js"\n` +
    `        data-url="${url}"\n` +
    `        data-text="${text}"\n` +
    `        data-color="${color}"\n` +
    `        data-position="${position}"\n` +
    `        data-mode="${mode}"></script>`
  );
}

// Sits under one "Embed" section on the catalog detail page — Option A
// (plain link, zero JS) and Option B (the widget.js floating/inline
// button) share the same text/color inputs since they're the same visual
// button either way, just delivered differently. Both always link to
// getCatalogPublicUrl's result, so the embedded button on a vendor's own
// site automatically points at their white-label domain once one is
// active — no separate config needed here for that.
export default function CatalogEmbedSection({ catalog }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'link' | 'widget'>('widget');
  const [text, setText] = useState('Visit Catalog');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [position, setPosition] = useState('bottom-right');
  const [mode, setMode] = useState<'newtab' | 'modal'>('newtab');
  const [copied, setCopied] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const url = getCatalogPublicUrl(catalog.slug, user);
  const snippet =
    tab === 'link' ? buildLinkSnippet(url, text, color) : buildWidgetSnippet(url, text, color, position, mode);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, non-secure context) — the
      // snippet is already visible and selectable, so this is a soft failure.
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
          <CodeIcon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Embed on Your Website</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Add a &quot;Visit Catalog&quot; button to your own site — no coding required, just paste the snippet below.
      </p>

      <div className="mt-5 inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setTab('link')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'link' ? 'bg-primary-700 text-white' : 'text-gray-500'
          }`}
        >
          Plain Link
        </button>
        <button
          type="button"
          onClick={() => setTab('widget')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'widget' ? 'bg-primary-700 text-white' : 'text-gray-500'
          }`}
        >
          Widget Button
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="embedText" className="block text-sm font-medium text-gray-700">
                Button text
              </label>
              <input
                id="embedText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>
            <div>
              <label htmlFor="embedColor" className="block text-sm font-medium text-gray-700">
                Button color
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1">
                <input
                  id="embedColor"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <span className="text-sm text-gray-500">{color}</span>
              </div>
            </div>
          </div>

          {tab === 'widget' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="embedPosition" className="block text-sm font-medium text-gray-700">
                  Position
                </label>
                <select
                  id="embedPosition"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">Ignored if placed inside a container on your page.</p>
              </div>
              <div>
                <label htmlFor="embedMode" className="block text-sm font-medium text-gray-700">
                  Click behavior
                </label>
                <select
                  id="embedMode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'newtab' | 'modal')}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                >
                  <option value="newtab">Open in new tab</option>
                  <option value="modal">Open in a popup on this page</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Preview</p>
            <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <span
                style={{ backgroundColor: color }}
                className="inline-block rounded-full px-6 py-3 text-sm font-semibold text-white shadow"
              >
                {text || 'Visit Catalog'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {tab === 'link' ? 'HTML snippet' : 'Script snippet'}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
            <code>{snippet}</code>
          </pre>
          <p className="mt-2 text-xs text-gray-400">
            {tab === 'link'
              ? 'Paste this anywhere in your site’s HTML — a plain link, no scripts involved.'
              : 'Paste this once, anywhere on your page. It shows as a floating button by default, or place a ' +
                '<div id="your-id"> and add data-target="your-id" to the tag to show it inline instead.'}
          </p>
          {tab === 'widget' && (
            <button
              type="button"
              onClick={() => setInstructionsOpen(true)}
              className="mt-2 text-xs font-medium text-primary-700 underline hover:text-primary-800"
            >
              How to add the Script snippet →
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={instructionsOpen} onClose={() => setInstructionsOpen(false)} title="How to add the Script snippet">
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900">Where you paste it depends on where you want the button:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-gray-600">
              <li>
                <strong>Every page</strong> (most common — a persistent floating button, like a chat bubble): add it
                <strong> once</strong> into a shared template included on every page (see platform-specific steps
                below).
              </li>
              <li>
                <strong>Just one page</strong>: paste it directly into that page&apos;s HTML, right before{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{'</body>'}</code>.
              </li>
              <li>
                <strong>Inline, inside a section</strong> (using <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">data-target</code>):
                paste it only on the page that has the matching{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{'<div id="...">'}</code>.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900">WordPress</p>
            <p className="mt-1 text-gray-600">
              Appearance → Theme File Editor → <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">footer.php</code>,
              right before <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{'</body>'}</code>. Or, if you&apos;d
              rather not edit theme files, use a plugin like &quot;Insert Headers and Footers&quot;.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">Shopify</p>
            <p className="mt-1 text-gray-600">
              Online Store → Themes → Edit Code →{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">theme.liquid</code>, right before{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{'</body>'}</code>.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">Wix / Squarespace</p>
            <p className="mt-1 text-gray-600">
              Settings → Custom Code (Wix) or Code Injection (Squarespace) — add it to the &quot;footer&quot; or
              &quot;every page&quot; section.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">A custom-built HTML site</p>
            <p className="mt-1 text-gray-600">
              If your pages share a common footer include/template, add it there. If each page is standalone HTML
              with no shared template, paste it into each page you want the button on — the script is harmless to
              load more than once, but there&apos;s no way around adding it per page without a shared layout.
            </p>
          </div>
        </div>
      </Modal>
    </section>
  );
}
