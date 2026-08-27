export function filterTicketByState(
  ticket: {
    workflowStateId?: string;
    statusId?: string;
    statusName?: string;
    workflowState?: { id?: string; name?: string };
    status?: { id?: string; name?: string };
    workflow?: { id?: string; name?: string };
  },
  targetState: { id: string; name: string } | undefined,
  targetName: string,
): boolean {
  const ticketStatusId =
    ticket.workflowStateId ||
    ticket.statusId ||
    ticket.workflow?.id ||
    ticket.status?.id;
  const ticketStatusName = (
    ticket.statusName ||
    ticket.workflowState?.name ||
    ticket.status?.name ||
    ticket.workflow?.name
  )?.toUpperCase();

  if (targetState && ticketStatusId === targetState.id) return true;
  if (ticketStatusName === targetName) return true;
  return false;
}
