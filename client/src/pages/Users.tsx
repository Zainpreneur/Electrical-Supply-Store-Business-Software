import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { User, Role } from "../api/types";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const empty = { name: "", email: "", password: "", role: "STAFF" as Role };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function load() {
    api.get<User[]>("/users").then((res) => setUsers(res.data));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(empty);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    setError("");
    try {
      await api.post("/users", form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function toggleActive(u: User) {
    if (u.id === me?.id) return;
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function changeRole(u: User, role: Role) {
    try {
      await api.put(`/users/${u.id}`, { role });
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">Manage staff accounts and permissions</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Add User
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-800">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="input py-1"
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-right">
                  {u.id !== me?.id && (
                    <button className="text-sm text-brand-600 hover:underline" onClick={() => toggleActive(u)}>
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add User" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Create User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
