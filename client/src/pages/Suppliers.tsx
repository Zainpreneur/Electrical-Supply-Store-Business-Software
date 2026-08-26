import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Supplier } from "../api/types";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const empty = { name: "", contactPerson: "", phone: "", email: "", address: "" };

export default function Suppliers() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function load() {
    api.get<Supplier[]>("/suppliers").then((res) => setSuppliers(res.data));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    setError("");
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
      } else {
        await api.post("/suppliers", form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Suppliers</h1>
          <p className="text-sm text-slate-500">Vendors you purchase electrical stock from</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            + Add Supplier
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">{s.name}</td>
                <td>{s.contactPerson || "—"}</td>
                <td>{s.phone || "—"}</td>
                <td>{s.email || "—"}</td>
                <td>{s._count?.products ?? 0}</td>
                <td className="text-right">
                  {canEdit && (
                    <>
                      <button className="mr-2 text-sm text-brand-600 hover:underline" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(s)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No suppliers yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Supplier" : "Add Supplier"} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input
                className="input"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
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
