import type { BuildingState, Incident } from "@/lib/ops/types";

export interface Investigation {
  rootCause: string;
  confidence: number;
  evidence: string[];
}

/** Reasons about the current building state to explain an incident. */
export function investigate(incident: Incident, b: BuildingState): Investigation {
  switch (incident.type) {
    case "energy_spike": {
      const zones = [b.hvacZone1, b.hvacZone2, b.hvacZone3];
      const hot = zones.indexOf(Math.max(...zones)) + 1;
      return {
        rootCause: `HVAC Zone ${hot} operating at maximum capacity despite low occupancy.`,
        confidence: 91,
        evidence: [
          `Energy draw ${Math.round(b.energy)} kW vs ~61 kW baseline (+${Math.round(((b.energy - 61) / 61) * 100)}%).`,
          `HVAC Zone ${hot} output ${zones[hot - 1]}% — other zones ${zones.filter((_, i) => i !== hot - 1).join("% / ")}%.`,
          `Occupancy only ${Math.round(b.occupancy)}% — cooling demand should be falling, not rising.`,
          `Temperature stable at ${b.temperature}°C, so the extra output is wasted.`,
        ],
      };
    }
    case "elevator_failure":
      return {
        rootCause: "Elevator 2 drive controller reported a fault and stopped between floors with passengers on board.",
        confidence: 94,
        evidence: [
          "Elevator 2 status changed to ERROR.",
          `${b.elevator2Occupancy} occupants detected in the car by load sensor.`,
          "Elevators 1 and 3 operating normally — fault is isolated to car 2.",
        ],
      };
    case "unauthorized_access":
      return {
        rootCause: "Repeated badge failures at a restricted room outside working hours suggest an intrusion attempt.",
        confidence: 88,
        evidence: [
          `Location: ${incident.context.location ?? "Server Room"} (restricted).`,
          `Time: ${incident.context.time ?? "02:13 AM"} — outside staffed hours.`,
          `${b.failedAccessAttempts} failed attempts within 4 minutes.`,
        ],
      };
    case "water_leak":
      return {
        rootCause: "Pressure drop and humidity rise on Floor 2 indicate a pipe leak in the east riser.",
        confidence: 86,
        evidence: [
          `Water pressure ${b.waterPressure} bar vs 3.2 bar normal.`,
          `Humidity ${Math.round(b.humidity)}% and climbing.`,
          "Floor 2 leak sensor triggered.",
        ],
      };
    case "hvac_failure":
      return {
        rootCause: "HVAC Zone 2 compressor stopped; zone temperature is drifting upward.",
        confidence: 90,
        evidence: [
          "HVAC Zone 2 output 0% with fault flag set.",
          `Building temperature ${b.temperature}°C and rising.`,
          "Backup unit for Zone 2 is available and healthy.",
        ],
      };
  }
}
