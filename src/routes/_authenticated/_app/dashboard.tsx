import { createFileRoute } from "@tanstack/react-router";
import { useOps } from "@/lib/ops/store";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center — AI Building Operations Agent" },
      { name: "description", content: "Live operations dashboard for Nexus Tower." },
      { property: "og:title", content: "Command Center — AI Building Operations Agent" },
      { property: "og:description", content: "Live operations dashboard for Nexus Tower." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useOps();
  const b = s.building;
  const kpis = [
    ["Temperature", `${b.temperature}°C`],
    ["Energy", `${Math.round(b.energy)} kW`],
    ["Occupancy", `${Math.round(b.occupancy)}%`],
    ["Humidity", `${Math.round(b.humidity)}%`],
    ["Water", b.waterStatus],
    ["HVAC", b.hvacFault ? "Fault" : "Operational"],
    ["Elevators", `${[b.elevator1, b.elevator2, b.elevator3].filter((e) => e === "OK").length}/3`],
    ["Security", b.securityStatus],
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{s.settings.buildingName} · {s.settings.location}</p>
        <h1 className="text-3xl font-semibold">Building Operations Command Center</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="panel p-5">
            <p className="eyebrow">{k}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
