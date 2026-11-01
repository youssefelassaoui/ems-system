import { EnergyFlowCard } from "@/components/ems/energy-flow-card";
import { AutarkyCard } from "@/components/overview/autarky-card";
import { EnergyMix } from "@/components/overview/energy-mix";
import { EventsCard } from "@/components/overview/events-card";
import { FleetGlance } from "@/components/overview/fleet-glance";
import { KpiRow } from "@/components/overview/kpi-row";
import { LiveBalance } from "@/components/overview/live-balance";
import { PowerProfile } from "@/components/overview/power-profile";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* First screen: a slim KPI strip and a 3D twin that fills the rest of the viewport. */}
      <section className="space-y-3" aria-label="Live overview">
        <KpiRow />
        <EnergyFlowCard className="enter [animation-delay:200ms] lg:h-[calc(100dvh-232px)] lg:min-h-[600px]" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <LiveBalance />
        <EnergyMix />
        <AutarkyCard className="lg:col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <PowerProfile />
        <EventsCard />
      </div>

      <FleetGlance />
    </div>
  );
}
