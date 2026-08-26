const styles: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  UNPAID: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-700",
  ORDERED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${styles[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
}
