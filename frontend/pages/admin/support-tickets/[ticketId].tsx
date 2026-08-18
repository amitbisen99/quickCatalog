import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { apiFetch, ApiError } from '@/utils/api';
import { TICKET_STATUS_STYLES, TICKET_STATUS_LABEL, TicketStatus } from '@/utils/supportTicket';

interface Ticket {
  id: string;
  companyName: string;
  vendorEmail: string;
  reason: string;
  contactPersonName: string;
  contactMethod: 'email' | 'mobile';
  contactValue: string;
  status: TicketStatus;
  createdAt: string;
}

function TicketDetail() {
  const router = useRouter();
  const ticketId = typeof router.query.ticketId === 'string' ? router.query.ticketId : '';

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    apiFetch<{ ticket: Ticket }>(`/admin/support-tickets/${ticketId}`)
      .then((res) => setTicket(res.ticket))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this ticket.'));
  }, [ticketId]);

  async function handleStatusChange(status: Ticket['status']) {
    setUpdatingStatus(true);
    try {
      const res = await apiFetch<{ ticket: Ticket }>(`/admin/support-tickets/${ticketId}/status`, {
        method: 'PUT',
        body: { status },
      });
      setTicket(res.ticket);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!ticket) {
    return (
      <AdminLayout title="Support Ticket">
        {error ? <Alert variant="error">{error}</Alert> : <p className="text-sm text-gray-500">Loading…</p>}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Support Ticket">
      <Link href="/admin/support-tickets" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to support tickets
      </Link>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.companyName}</h1>
                <p className="mt-1 text-sm text-gray-600">{ticket.vendorEmail}</p>
                <p className="mt-1 text-xs text-gray-400">Submitted {new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TICKET_STATUS_STYLES[ticket.status]}`}>
                {TICKET_STATUS_LABEL[ticket.status]}
              </span>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason for contact</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{ticket.reason}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as Ticket['status'])}
              disabled={updatingStatus}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact details</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Person to contact</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{ticket.contactPersonName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Preferred contact method</dt>
                <dd className="mt-0.5 font-medium text-gray-900 capitalize">{ticket.contactMethod}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{ticket.contactMethod === 'email' ? 'Email' : 'Mobile'}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{ticket.contactValue}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAdminAuth(TicketDetail);
