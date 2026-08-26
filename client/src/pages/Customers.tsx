import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Customer } from "../api/types";
import { money } from "../lib/format";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const empty = { name: "", phone: "", email: "", address: "" };

export default function Customers() {
  const { user } = useAuth();
  const canDelete = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function load() {
    api.get<Customer[]>("/customers", { params: search ? { search } : {} }).then((res) => setCustomers(res.data));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    setError("");
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
      } else {
        await api.post("/customers", form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">Customer accounts and outstanding balances</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Add Customer
        </button>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Outstanding</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-800">{c.name}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
                <td className={c.outstanding && c.outstanding > 0 ? "font-semibold text-amber-700" : ""}>
                  {money(c.outstanding || 0)}
                </td>
                <td className="text-right">
                  <button className="mr-2 text-sm text-brand-600 hover:underline" onClick={() => openEdit(c)}>
                    Edit
                  </button>
                  {canDelete && (
                    <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(c)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Customer" : "Add Customer"} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <textarea
                className="input"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
