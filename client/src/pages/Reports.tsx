import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/format";
import StatCard from "../components/StatCard";

interface SalesSummary {
  salesCount: number;
  revenue: number;
  cost: number;
  profit: number;
  outstanding: number;
  topProducts: { productId: number; name: string; sku: string; quantity: number; revenue: number }[];
}

interface InventoryRow {
  id: number;
  sku: string;
  name: string;
  category: string;
  stockQty: number;
  costPrice: number;
  sellPrice: number;
  costValue: number;
  retailValue: number;
}

interface InventoryValuation {
  rows: InventoryRow[];
  totalCostValue: number;
  totalRetailValue: number;
}

interface LowStockProduct {
  id: number;
  sku: string;
  name: string;
  stockQty: number;
  reorderLevel: number;
  category?: { name: string } | null;
  supplier?: { name: string } | null;
}

type Tab = "sales" | "inventory" | "lowstock";

export default function Reports() {
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    if (tab === "sales") {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      api.get<SalesSummary>("/reports/sales-summary", { params }).then((res) => setSummary(res.data));
    } else if (tab === "inventory") {
      api.get<InventoryValuation>("/reports/inventory-valuation").then((res) => setValuation(res.data));
    } else {
      api.get<LowStockProduct[]>("/reports/low-stock").then((res) => setLowStock(res.data));
    }
  }, [tab, from, to]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500">Sales performance, inventory valuation, and stock alerts</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(["sales", "inventory", "lowstock"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "sales" ? "Sales Summary" : t === "inventory" ? "Inventory Valuation" : "Low Stock"}
          </button>
        ))}
      </div>

      {tab === "sales" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          {summary && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Revenue" value={money(summary.revenue)} sub={`${summary.salesCount} sale(s)`} />
                <StatCard label="Cost of Goods" value={money(summary.cost)} />
                <StatCard label="Gross Profit" value={money(summary.profit)} />
                <StatCard label="Outstanding" value={money(summary.outstanding)} tone="warning" />
              </div>
              <div className="card overflow-x-auto p-4">
                <h2 className="mb-3 font-semibold text-slate-800">Top Products</h2>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topProducts.map((p) => (
                      <tr key={p.productId}>
                        <td className="font-medium text-slate-800">{p.name}</td>
                        <td className="font-mono text-xs text-slate-500">{p.sku}</td>
                        <td>{p.quantity}</td>
                        <td>{money(p.revenue)}</td>
                      </tr>
                    ))}
                    {summary.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No sales in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "inventory" && valuation && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Total Cost Value" value={money(valuation.totalCostValue)} />
            <StatCard label="Total Retail Value" value={money(valuation.totalRetailValue)} />
          </div>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Cost Value</th>
                  <th>Retail Value</th>
                </tr>
              </thead>
              <tbody>
                {valuation.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-slate-500">{r.sku}</td>
                    <td className="font-medium text-slate-800">{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.stockQty}</td>
                    <td>{money(r.costValue)}</td>
                    <td>{money(r.retailValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "lowstock" && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Stock</th>
                <th>Reorder Level</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id} className="bg-amber-50">
                  <td className="font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="font-medium text-slate-800">{p.name}</td>
                  <td className="font-semibold text-amber-700">{p.stockQty}</td>
                  <td>{p.reorderLevel}</td>
                  <td>{p.supplier?.name || "—"}</td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    All products are above their reorder level 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
