import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Category } from "../api/types";
import Modal from "../components/Modal";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.get<Category[]>("/categories").then((res) => setCategories(res.data));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setError("");
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    setError("");
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, { name });
      } else {
        await api.post("/categories", { name });
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500">Group products for easier browsing and reporting</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Add Category
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-800">{c.name}</td>
                <td>{c._count?.products ?? 0}</td>
                <td className="text-right">
                  <button className="mr-2 text-sm text-brand-600 hover:underline" onClick={() => openEdit(c)}>
                    Edit
                  </button>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400">
                  No categories yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Category" : "Add Category"} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
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
