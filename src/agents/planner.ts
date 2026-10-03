import type { ActionId, IncidentType } from "@/lib/ops/types";

export interface PlanStep {
  actionId: ActionId;
  label: string;
}

/** Turns an investigated incident into an ordered action plan. Governance is applied afterwards. */
export function plan(type: IncidentType): PlanStep[] {
  switch (type) {
    case "energy_spike":
      return [{ actionId: "reduce_hvac", label: "Reduce HVAC Zone 3 output by 15%" }];
    case "elevator_failure":
      return [
        { actionId: "notify_security", label: "Notify security" },
        { actionId: "create_ticket", label: "Create maintenance ticket" },
        { actionId: "restrict_elevator", label: "Restrict Elevator 2" },
        { actionId: "monitor_incident", label: "Monitor incident" },
      ];
    case "unauthorized_access":
      return [
        { actionId: "create_security_incident", label: "Create security incident" },
        { actionId: "notify_security", label: "Notify security" },
        { actionId: "restrict_server_access", label: "Restrict server room access" },
      ];
    case "water_leak":
      return [
        { actionId: "create_ticket", label: "Create plumbing maintenance ticket" },
        { actionId: "isolate_water", label: "Isolate Floor 2 water supply" },
      ];
    case "hvac_failure":
      return [
        { actionId: "switch_backup_hvac", label: "Switch Zone 2 to backup HVAC unit" },
        { actionId: "create_ticket", label: "Create HVAC maintenance ticket" },
      ];
  }
}
