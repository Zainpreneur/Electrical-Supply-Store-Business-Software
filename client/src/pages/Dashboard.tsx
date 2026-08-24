import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../api/client";
import { DashboardData } from "../api/types";
import { money, dateTime } from "../lib/format";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/reports/dashboard")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard…</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load dashboard.</div>;

  const chartData = data.lowStockItems.map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    stock: p.stockQty,
    reorder: p.reorderLevel,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of today's store performance</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={money(data.todayRevenue)} sub={`${data.todaySalesCount} sale(s)`} icon="💵" />
        <StatCard label="This Month" value={money(data.monthRevenue)} sub={`${data.monthSalesCount} sale(s)`} icon="📈" />
        <StatCard label="Inventory Value" value={money(data.inventoryValue)} sub={`${data.totalProducts} active products`} icon="🔌" />
        <StatCard
          label="Low Stock Alerts"
          value={String(data.lowStockCount)}
          sub="items at/below reorder level"
          icon="⚠️"
          tone={data.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Sales</h2>
            <Link to="/sales" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No sales yet
                    </td>
                  </tr>
                )}
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-medium text-slate-700">{sale.saleNumber}</td>
                    <td>{sale.customer?.name || "Walk-in"}</td>
                    <td>{money(sale.total)}</td>
                    <td>
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="text-slate-500">{dateTime(sale.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Low Stock</h2>
            <Link to="/products" className="text-sm text-brand-600 hover:underline">
              Manage
            </Link>
          </div>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">All products are well stocked 🎉</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#2563eb" radius={[0, 4, 4, 0]} name="In stock" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
