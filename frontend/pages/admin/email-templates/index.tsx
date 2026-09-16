import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { ChevronDownIcon, CheckCircleIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface EmailTemplate {
  slug: string;
  label: string;
  group: string;
  subject: string;
  body: string;
}

// Matches backend/src/utils/lifecycleEmails.js's SEQUENCE_DEFS grouping
// exactly — the four merge fields it resolves at send time.
const MERGE_FIELDS = [
  { tag: '{{businessName}}', hint: "vendor's business name" },
  { tag: '{{catalogLink}}', hint: 'their catalog — blank if none yet' },
  { tag: '{{upgradeLink}}', hint: 'link to upgrade to paid' },
  { tag: '{{dashboardLink}}', hint: 'link to their dashboard' },
];

const GROUP_LABEL: Record<string, string> = {
  D: 'Not Verified Yet',
  A: 'No Catalog Created',
  B: 'No Products Added',
  E: 'Catalog Shared — Tip',
  C: 'Not Upgraded to Paid',
};

const GROUP_ORDER = ['D', 'A', 'B', 'E', 'C'];

function groupTemplates(templates: EmailTemplate[]): [string, EmailTemplate[]][] {
  return GROUP_ORDER.map((group) => [group, templates.filter((t) => t.group === group)] as [string, EmailTemplate[]]).filter(
    ([, list]) => list.length > 0
  );
}

function TemplateRow({
  template,
  onSaved,
}: {
  template: EmailTemplate;
  onSaved: (updated: EmailTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const isReady = Boolean(template.subject && template.body);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await apiFetch<{ template: EmailTemplate }>(`/admin/email-templates/${template.slug}`, {
        method: 'PUT',
        body: { subject, body },
      });
      onSaved(res.template);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isReady ? 'Ready' : 'Not written'}
          </span>
          <p className="truncate text-sm font-medium text-gray-900">{template.label}</p>
        </div>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Email body (HTML supported)"
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map((mf) => (
              <span
                key={mf.tag}
                title={mf.hint}
                className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600"
              >
                {mf.tag}
              </span>
            ))}
          </div>

          {error && (
            <div className="mt-3">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircleIcon className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ templates: EmailTemplate[] }>('/admin/email-templates')
      .then((res) => setTemplates(res.templates))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load email templates.'));
  }, []);

  function handleSaved(updated: EmailTemplate) {
    setTemplates((prev) => prev?.map((t) => (t.slug === updated.slug ? updated : t)) || null);
  }

  return (
    <AdminLayout title="Email Templates">
      <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
      <p className="mt-1.5 text-base text-gray-500">
        The lifecycle emails sent automatically to new vendors based on where they are in onboarding. A stage&apos;s
        emails stop as soon as the vendor moves past it (or upgrades to paid, which stops everything). Only applies
        to vendors who sign up from when this feature went live — not backdated to existing accounts.
      </p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {templates === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groupTemplates(templates).map(([group, list]) => (
            <div key={group}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">{GROUP_LABEL[group] || group}</h2>
              <div className="mt-3 space-y-2">
                {list.map((t) => (
                  <TemplateRow key={t.slug} template={t} onSaved={handleSaved} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default withAdminAuth(EmailTemplates);
