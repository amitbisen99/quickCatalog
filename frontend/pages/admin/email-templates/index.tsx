import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { ChevronDownIcon, CheckCircleIcon, CodeIcon, MailIcon } from '@/components/icons';
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testError, setTestError] = useState('');
  const [testSent, setTestSent] = useState(false);

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

  // Inserts <a href="URL">text</a> at the cursor position (or at the end,
  // if the textarea never had focus) rather than just appending — the
  // body is a plain textarea, not a rich-text editor, so this is the
  // simplest way to add a link without hand-writing HTML. The URL itself
  // can be a merge field too (e.g. {{catalogLink}}) — it's just text
  // dropped into the body, resolved the same as everywhere else in it.
  function handleInsertLink() {
    if (!linkUrl.trim()) return;
    const anchor = `<a href="${linkUrl.trim()}">${linkText.trim() || linkUrl.trim()}</a>`;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + anchor + body.slice(end);
    setBody(next);
    setLinkText('');
    setLinkUrl('');
    setLinkFormOpen(false);
    // Refocus with the cursor right after the inserted link, same as a
    // normal editor would leave it — otherwise focus is lost to the
    // (now-closed) link form and the next keystroke goes nowhere useful.
    requestAnimationFrame(() => {
      el?.focus();
      const cursor = start + anchor.length;
      el?.setSelectionRange(cursor, cursor);
    });
  }

  // Sends whatever's currently typed (subject/body), not what's saved —
  // lets an in-progress edit be previewed without saving first.
  async function handleSendTest() {
    setSendingTest(true);
    setTestError('');
    setTestSent(false);
    try {
      await apiFetch(`/admin/email-templates/${template.slug}/test`, {
        method: 'POST',
        body: { to: testEmail, subject, body },
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch (err) {
      setTestError(err instanceof ApiError ? err.message : 'Could not send the test email.');
    } finally {
      setSendingTest(false);
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

          <div className="mt-4 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Body</label>
            <button
              type="button"
              onClick={() => setLinkFormOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              <CodeIcon className="h-3.5 w-3.5" />
              Insert Custom Link
            </button>
          </div>

          {linkFormOpen && (
            <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="min-w-[140px] flex-1">
                <label className="block text-[11px] font-medium text-gray-500">Link text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. View your catalog"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="block text-[11px] font-medium text-gray-500">URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://… or {{catalogLink}}"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="rounded-md bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Insert
              </button>
            </div>
          )}

          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Email body (HTML supported)"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
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

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
            <div className="min-w-[200px] flex-1">
              <label className="block text-[11px] font-medium text-gray-500">Send a test to</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail.trim() || !subject.trim() || !body.trim()}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MailIcon className="h-3.5 w-3.5" />
              {sendingTest ? 'Sending…' : 'Send Test Email'}
            </button>
            {testSent && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircleIcon className="h-4 w-4" /> Sent
              </span>
            )}
          </div>
          {testError && (
            <div className="mt-2">
              <Alert variant="error">{testError}</Alert>
            </div>
          )}
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
