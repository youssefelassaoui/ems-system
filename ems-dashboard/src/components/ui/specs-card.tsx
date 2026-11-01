import type { ReactNode } from "react";
import type { AssetSpec } from "@/lib/assets";
import { Card, CardHeader } from "@/components/ui/card";

/** Static specification sheet — label / value rows with a hairline between them. */
export function SpecsCard({
  title,
  subtitle,
  icon,
  specs,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  specs: readonly AssetSpec[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      <dl className="divide-y divide-line">
        {specs.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-[12.5px] font-medium text-ink-500">{s.label}</dt>
            <dd className="num text-right text-[13px] font-semibold text-ink-900">{s.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-4 border-t border-line pt-4">{footer}</div>}
    </Card>
  );
}
