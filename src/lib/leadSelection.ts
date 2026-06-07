/**
 * Resolve which lead id should be selected.
 *
 * `selectedLeadId` drives two different UIs in ViewAllLeads:
 *  - a PERSISTENT side panel (inbox / follow-ups / saved) that should always show a
 *    selection, defaulting to the first lead;
 *  - a CLOSEABLE modal (pipeline) where `null` means "closed".
 *
 * The persistent-panel default must NOT apply to the modal, or closing the modal
 * (setting null) is immediately undone and the modal can never be closed.
 */
export function resolveSelectedLeadId(
  isModalMode: boolean,
  currentId: string | null,
  leadIds: string[],
): string | null {
  if (leadIds.length === 0) return null;
  const currentIsValid = currentId !== null && leadIds.includes(currentId);
  if (isModalMode) {
    // Keep a valid selection; otherwise stay closed. Never auto-open.
    return currentIsValid ? currentId : null;
  }
  // Persistent panel: always show a selection — default to first, fix stale ids.
  return currentIsValid ? currentId : leadIds[0];
}
