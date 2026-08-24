import { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "warning"
      ? "text-amber-600 bg-amber-50"
      : tone === "danger"
      ? "text-red-600 bg-red-50"
      : "text-brand-600 bg-brand-50";

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {icon && <div className={`rounded-md p-2 ${toneClasses}`}>{icon}</div>}
      </div>
    </div>
  );
}
