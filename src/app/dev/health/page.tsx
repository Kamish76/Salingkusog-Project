import { connection } from "next/server";
import { HealthDashboardClient } from "./health-dashboard-client";

export const instant = false;

export default async function DevHealthPage() {
  await connection();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>⚡</span>
            <span>API Health & Production Diagnostics</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real-time latency probes, isolated failure monitoring, and server diagnostic logs.
          </p>
        </div>
      </div>

      <HealthDashboardClient />
    </div>
  );
}
