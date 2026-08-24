import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Sale } from "../api/types";
import { money, dateTime } from "../lib/format";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function SalesHistory() {
  const { user } = useAuth();
  const canVoid = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [sales, setSales] = useState<Sale[]>([]);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [error, setError] = useState("");

  function load() {
    api.get<Sale[]>("/sales", { params: status ? { status } : {} }).then((res) => setSales(res.data));
  }

  useEffect(load, [status]);

  async function openDetail(sale: Sale) {
    const res = await api.get<Sale>(`/sales/${sale.id}`);
    setDetail(res.data);
    setPaymentAmount("");
    setError("");
  }

  async function handleRecordPayment() {
    if (!detail || !paymentAmount) return;
    try {
      await api.post(`/sales/${detail.id}/payments`, { amount: Number(paymentAmount) });
      const res = await api.get<Sale>(`/sales/${detail.id}`);
      setDetail(res.data);
      setPaymentAmount("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function voidSale(sale: Sale) {
    if (!confirm(`Void sale ${sale.saleNumber}? This will restore stock and delete the sale.`)) return;
    try {
      await api.post(`/sales/${sale.id}/void`);
      setDetail(null);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sales History</h1>
          <p className="text-sm text-slate-500">All invoices, filterable by payment status</p>
        </div>
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">{s.saleNumber}</td>
                <td>{s.customer?.name || "Walk-in"}</td>
                <td>{money(s.total)}</td>
                <td>{money(s.amountPaid)}</td>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td className="text-slate-500">{dateTime(s.createdAt)}</td>
                <td className="text-right">
                  <button className="text-sm text-brand-600 hover:underline" onClick={() => openDetail(s)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={`Invoice ${detail.saleNumber}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium text-slate-800">{detail.customer?.name || "Walk-in customer"}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{money(detail.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>-{money(detail.discount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>{money(detail.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800">
                <span>Total</span>
                <span>{money(detail.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid</span>
                <span>{money(detail.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700">
                <span>Balance</span>
                <span>{money(detail.total - detail.amountPaid)}</span>
              </div>
            </div>

            {detail.status !== "PAID" && (
              <div className="flex items-end gap-2 border-t border-slate-100 pt-3">
                <div className="flex-1">
                  <label className="label">Record Payment</label>
                  <input
                    type="number"
                    className="input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Amount"
                  />
                </div>
                <button className="btn-primary" onClick={handleRecordPayment}>
                  Add Payment
                </button>
              </div>
            )}

            {canVoid && (
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button className="btn-danger" onClick={() => voidSale(detail)}>
                  Void Sale (restores stock)
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
