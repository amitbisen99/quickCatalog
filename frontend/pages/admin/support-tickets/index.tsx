import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import Alert from '@/components/Alert';
import { EyeIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';
import { TICKET_STATUS_STYLES, TICKET_STATUS_LABEL, TicketStatus } from '@/utils/supportTicket';

interface TicketSummary {
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

interface TicketsResponse {
  tickets: TicketSummary[];
  total: number;
  page: number;
  pages: number;
}

function SupportTickets() {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const loadTickets = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));

    apiFetch<TicketsResponse>(`/admin/support-tickets?${params}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load support tickets.'));
  }, [status, page]);

  useEffect(loadTickets, [loadTickets]);

  return (
    <AdminLayout title="Support Tickets">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="mt-1 text-sm text-gray-500">Messages vendors have sent from their Support tab.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {data === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : data.tickets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-900">No support tickets</p>
            <p className="mt-1 text-sm text-gray-500">Nothing here yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Contact Person</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Reason</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{ticket.companyName}</p>
                      <p className="text-xs text-gray-500">{ticket.vendorEmail}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{ticket.contactPersonName}</td>
                    <td className="hidden max-w-xs px-4 py-3 text-gray-600 md:table-cell">
                      <p className="truncate">{ticket.reason}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TICKET_STATUS_STYLES[ticket.status]}`}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/support-tickets/${ticket.id}`} className="text-gray-400 hover:text-primary-700" title="View">
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={data.page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {data.page} of {data.pages} · {data.total} ticket{data.total === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={data.page >= data.pages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

export default withAdminAuth(SupportTickets);
