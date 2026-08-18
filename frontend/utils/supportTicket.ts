export type TicketStatus = 'open' | 'in_progress' | 'closed';

// Shared between the admin support-tickets list and detail pages so the
// two never drift on styling/labels for the same status value.
export const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};
