export type CrmStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

// Editable/reorderable stages. "new" is intentionally excluded: it is locked and
// always rendered first (scans drop prospects there), and is never persisted.
export const NON_NEW_STAGES: CrmStatus[] = ["contacted", "qualified", "proposal", "won", "lost"];

export interface StagePrefs {
  order: CrmStatus[];
  labels: Partial<Record<CrmStatus, string>>;
}

const isNonNewStage = (value: unknown): value is CrmStatus =>
  typeof value === "string" && (NON_NEW_STAGES as string[]).includes(value);

/**
 * Validate raw persisted stage prefs (from DB jsonb or localStorage) into a
 * complete, safe shape: `order` is always every NON_NEW_STAGES exactly once
 * (custom order honored, unknowns dropped, missing appended); `labels` keeps
 * only string labels for editable stages.
 */
export function parseStagePrefs(raw: unknown): StagePrefs {
  const result: StagePrefs = { order: [...NON_NEW_STAGES], labels: {} };
  if (!raw || typeof raw !== "object") return result;

  const obj = raw as { order?: unknown; labels?: unknown };

  if (Array.isArray(obj.order)) {
    const valid = [...new Set(obj.order.filter(isNonNewStage))];
    const present = new Set(valid);
    result.order = [...valid, ...NON_NEW_STAGES.filter(stage => !present.has(stage))];
  }

  if (obj.labels && typeof obj.labels === "object") {
    const labels: Partial<Record<CrmStatus, string>> = {};
    for (const [key, value] of Object.entries(obj.labels as Record<string, unknown>)) {
      if (isNonNewStage(key) && typeof value === "string" && value.trim().length > 0) labels[key] = value;
    }
    result.labels = labels;
  }

  return result;
}
