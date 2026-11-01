import { Cpu } from "lucide-react";
import {
  PV_SYSTEMS,
  TOTAL_AC_KW,
  TOTAL_INVERTERS,
  TOTAL_KWP,
  TOTAL_MODULES,
  TOTAL_STRINGS,
  formatInverters,
  needsBifacialTag,
} from "@/lib/pv-systems";
import { percent } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";

const num = (n: number) => n.toLocaleString("en-US");

/** Static equipment sheet: module technology, strings and inverters of every PV system. */
export function Configuration({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title="Fleet configuration"
        subtitle="Module technology, strings and inverters of each PV system"
        icon={<Cpu className="size-5" />}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <th className="pb-3 pr-4 font-semibold">System</th>
              <th className="pb-3 pr-4 font-semibold">Module technology</th>
              <th className="pb-3 pr-4 text-right font-semibold">Module</th>
              <th className="pb-3 pr-4 text-right font-semibold">Modules</th>
              <th className="pb-3 pr-4 text-right font-semibold">Strings</th>
              <th className="pb-3 pr-4 font-semibold">Inverters</th>
              <th className="pb-3 pr-4 text-right font-semibold">DC</th>
              <th className="pb-3 pr-4 text-right font-semibold">AC</th>
              <th className="pb-3 text-right font-semibold">DC / AC</th>
            </tr>
          </thead>
          <tbody>
            {PV_SYSTEMS.map((cfg) => (
              <tr key={cfg.id} className="border-t border-line/80 transition-colors hover:bg-brand-50/40">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: cfg.color }} />
                    <span className="whitespace-nowrap font-semibold text-ink-900">{cfg.name}</span>
                  </div>
                </td>
                <td className="py-3.5 pr-4">
                  <p className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-ink-900">
                    {cfg.technology.name}
                    {needsBifacialTag(cfg.technology) && (
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-100">
                        Bifacial
                      </span>
                    )}
                  </p>
                  <p className="whitespace-nowrap text-[11.5px] text-ink-400">{cfg.technology.cell}</p>
                </td>
                <td className="num whitespace-nowrap py-3.5 pr-4 text-right">
                  <p className="font-semibold text-ink-800">{cfg.moduleWp} Wp</p>
                  <p className="text-[11.5px] text-ink-400">{percent(cfg.technology.efficiency, 1)} eff.</p>
                </td>
                <td className="num py-3.5 pr-4 text-right font-semibold text-ink-800">{num(cfg.modules)}</td>
                <td className="num whitespace-nowrap py-3.5 pr-4 text-right">
                  <p className="font-semibold text-ink-800">{cfg.stringCount}</p>
                  <p className="text-[11.5px] text-ink-400">× {cfg.modulesPerString} modules</p>
                </td>
                <td className="num whitespace-nowrap py-3.5 pr-4">
                  <p className="font-semibold text-ink-800">{formatInverters(cfg.inverters)}</p>
                  <p className="text-[11.5px] text-ink-400">{cfg.inverters.kind} inverters</p>
                </td>
                <td className="num whitespace-nowrap py-3.5 pr-4 text-right font-semibold text-ink-800">
                  {num(cfg.kWp)} kWp
                </td>
                <td className="num whitespace-nowrap py-3.5 pr-4 text-right font-semibold text-ink-800">
                  {num(cfg.acLimitKw)} kW
                </td>
                <td className="num py-3.5 text-right font-semibold text-ink-800">{cfg.dcAcRatio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line text-ink-900">
              <td className="py-3.5 pr-4 font-display font-semibold" colSpan={2}>
                Total fleet
              </td>
              <td className="py-3.5 pr-4" />
              <td className="num py-3.5 pr-4 text-right font-bold">{num(TOTAL_MODULES)}</td>
              <td className="num py-3.5 pr-4 text-right font-bold">{num(TOTAL_STRINGS)}</td>
              <td className="num py-3.5 pr-4 font-bold">{TOTAL_INVERTERS} inverters</td>
              <td className="num whitespace-nowrap py-3.5 pr-4 text-right font-bold">{num(TOTAL_KWP)} kWp</td>
              <td className="num whitespace-nowrap py-3.5 pr-4 text-right font-bold">{num(TOTAL_AC_KW)} kW</td>
              <td className="num py-3.5 text-right font-bold">{(TOTAL_KWP / TOTAL_AC_KW).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-ink-400">
        Strings are modules connected in series; capacity is modules × rated module power. Each technology has its
        own efficiency and temperature coefficient in the production model.
      </p>
    </Card>
  );
}
