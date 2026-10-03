import { setState } from "./store";
import type { AuditEvent, AuditType } from "./types";
import { uid } from "./util";

export function logAudit(e: Omit<AuditEvent, "id" | "ts">) {
  const entry: AuditEvent = { ...e, id: uid(), ts: new Date().toISOString() };
  setState((s) => ({ ...s, audit: [entry, ...s.audit].slice(0, 500) }));
}

export const AUDIT_FILTERS: { key: string; label: string; types: AuditType[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "ai", label: "AI", types: ["AI"] },
  { key: "gov", label: "Governance", types: ["GOVERNANCE"] },
  { key: "auto", label: "Automation", types: ["AUTOMATION", "ACTION"] },
  { key: "inc", label: "Incidents", types: ["INCIDENT", "RESULT"] },
  { key: "ver", label: "Verification", types: ["VERIFICATION"] },
];
