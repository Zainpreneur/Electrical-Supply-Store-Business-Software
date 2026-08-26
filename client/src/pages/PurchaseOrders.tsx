import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { PurchaseOrder, Supplier, Product } from "../api/types";
import { money, date } from "../lib/format";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

interface DraftItem {
  productId: number;
  quantity: number;
  unitCost: number;
}

export default function PurchaseOrders() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState<number | "">("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState("");

  function load() {
    api.get<PurchaseOrder[]>("/purchase-orders").then((res) => setOrders(res.data));
  }

  useEffect(() => {
    load();
    api.get<Supplier[]>("/suppliers").then((res) => setSuppliers(res.data));
    api.get<Product[]>("/products").then((res) => setProducts(res.data));
  }, []);

  function openCreate() {
    setSupplierId("");
    setItems([]);
    setNotes("");
    setError("");
    setShowModal(true);
  }

  function addItem() {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1, unitCost: products[0].costPrice }]);
  }

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  async function handleSubmit() {
    setError("");
    if (!supplierId) return setError("Select a supplier");
    if (items.length === 0) return setError("Add at least one line item");
    try {
      await api.post("/purchase-orders", { supplierId, items, notes: notes || undefined });
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleReceive(po: PurchaseOrder) {
    if (!confirm(`Mark PO ${po.poNumber} as received? This will add stock to inventory.`)) return;
    try {
      await api.post(`/purchase-orders/${po.id}/receive`);
      load();
      setDetail(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function handleCancel(po: PurchaseOrder) {
    if (!confirm(`Cancel PO ${po.poNumber}?`)) return;
    try {
      await api.post(`/purchase-orders/${po.id}/cancel`);
      load();
      setDetail(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function openDetail(po: PurchaseOrder) {
    const res = await api.get<PurchaseOrder>(`/purchase-orders/${po.id}`);
    setDetail(res.data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Order stock from suppliers and receive it into inventory</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            + New Purchase Order
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Total</th>
              <th>Ordered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <tr key={po.id}>
                <td className="font-medium text-slate-800">{po.poNumber}</td>
                <td>{po.supplier?.name}</td>
                <td>
                  <StatusBadge status={po.status} />
                </td>
                <td>{money(po.total)}</td>
                <td className="text-slate-500">{date(po.orderDate)}</td>
                <td className="text-right">
                  <button className="text-sm text-brand-600 hover:underline" onClick={() => openDetail(po)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No purchase orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New Purchase Order" onClose={() => setShowModal(false)} wide>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Line Items</label>
                <button className="text-sm text-brand-600 hover:underline" onClick={addItem}>
                  + Add item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-2">
                    <select
                      className="input col-span-6"
                      value={item.productId}
                      onChange={(e) => {
                        const p = products.find((pr) => pr.id === Number(e.target.value));
                        updateItem(idx, { productId: Number(e.target.value), unitCost: p?.costPrice ?? item.unitCost });
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="input col-span-2"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      placeholder="Qty"
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="input col-span-3"
                      value={item.unitCost}
                      onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                      placeholder="Unit cost"
                    />
                    <button className="col-span-1 text-red-500" onClick={() => removeItem(idx)}>
                      ✕
                    </button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-sm text-slate-400">No items added yet</p>}
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-sm font-semibold text-slate-700">Total: {money(total)}</p>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSubmit}>
                  Create Order
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Purchase Order ${detail.poNumber}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Supplier</p>
                <p className="font-medium text-slate-800">{detail.supplier?.name}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unitCost)}</td>
                    <td>{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-semibold text-slate-700">Total: {money(detail.total)}</p>
            {detail.notes && <p className="text-sm text-slate-500">Notes: {detail.notes}</p>}
            {canCreate && detail.status === "ORDERED" && (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button className="btn-danger" onClick={() => handleCancel(detail)}>
                  Cancel Order
                </button>
                <button className="btn-primary" onClick={() => handleReceive(detail)}>
                  Mark as Received
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
