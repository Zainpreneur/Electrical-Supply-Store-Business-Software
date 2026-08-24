import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Product, Category, Supplier } from "../api/types";
import { money } from "../lib/format";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  sku: "",
  name: "",
  brand: "",
  unit: "pcs",
  costPrice: 0,
  sellPrice: 0,
  stockQty: 0,
  reorderLevel: 5,
  categoryId: "" as string | number,
  supplierId: "" as string | number,
  description: "",
};

export default function Products() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  async function load() {
    const [p, c, s] = await Promise.all([
      api.get<Product[]>("/products", { params: search ? { search } : {} }),
      api.get<Category[]>("/categories"),
      api.get<Supplier[]>("/suppliers"),
    ]);
    setProducts(p.data);
    setCategories(c.data);
    setSuppliers(s.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get<Product[]>("/products", { params: search ? { search } : {} }).then((res) => setProducts(res.data));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      brand: p.brand || "",
      unit: p.unit,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      categoryId: p.categoryId || "",
      supplierId: p.supplierId || "",
      description: p.description || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    setError("");
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty),
        reorderLevel: Number(form.reorderLevel),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDeactivate(p: Product) {
    if (!confirm(`Deactivate ${p.name}?`)) return;
    await api.delete(`/products/${p.id}`);
    load();
  }

  async function handleAdjustSubmit() {
    if (!adjustFor) return;
    try {
      await api.post(`/products/${adjustFor.id}/adjust-stock`, { quantity: adjustQty, reason: adjustReason });
      setAdjustFor(null);
      setAdjustQty(0);
      setAdjustReason("");
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500">Manage inventory, pricing, and stock levels</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            + Add Product
          </button>
        )}
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name, SKU, or brand…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.stockQty <= p.reorderLevel ? "bg-amber-50" : ""}>
                <td className="font-mono text-xs text-slate-500">{p.sku}</td>
                <td className="font-medium text-slate-800">
                  {p.name}
                  {p.brand && <span className="ml-1 text-xs text-slate-400">({p.brand})</span>}
                </td>
                <td>{p.category?.name || "—"}</td>
                <td>{p.unit}</td>
                <td>{money(p.costPrice)}</td>
                <td>{money(p.sellPrice)}</td>
                <td>
                  <span className={p.stockQty <= p.reorderLevel ? "font-semibold text-amber-700" : ""}>
                    {p.stockQty}
                  </span>
                  <span className="text-xs text-slate-400"> / reorder {p.reorderLevel}</span>
                </td>
                <td className="whitespace-nowrap text-right">
                  {canEdit && (
                    <>
                      <button className="mr-2 text-sm text-brand-600 hover:underline" onClick={() => setAdjustFor(p)}>
                        Adjust
                      </button>
                      <button className="mr-2 text-sm text-brand-600 hover:underline" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button className="text-sm text-red-600 hover:underline" onClick={() => handleDeactivate(p)}>
                        Deactivate
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Product" : "Add Product"} onClose={() => setShowModal(false)} wide>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">SKU</label>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Brand</label>
                <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <label className="label">Unit</label>
                <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Supplier</label>
                <select
                  className="input"
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cost Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Sell Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.sellPrice}
                  onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">{editing ? "Current Stock" : "Initial Stock"}</label>
                <input
                  type="number"
                  className="input"
                  value={form.stockQty}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
                />
                {editing && <p className="mt-1 text-xs text-slate-400">Use "Adjust" to change stock.</p>}
              </div>
              <div>
                <label className="label">Reorder Level</label>
                <input
                  type="number"
                  className="input"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editing ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {adjustFor && (
        <Modal title={`Adjust Stock — ${adjustFor.name}`} onClose={() => setAdjustFor(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Current stock: <strong>{adjustFor.stockQty}</strong> {adjustFor.unit}
            </p>
            <div>
              <label className="label">Quantity change (use negative to remove)</label>
              <input
                type="number"
                className="input"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Reason</label>
              <input
                className="input"
                placeholder="e.g. damaged, stock count correction"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setAdjustFor(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAdjustSubmit}>
                Apply Adjustment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
