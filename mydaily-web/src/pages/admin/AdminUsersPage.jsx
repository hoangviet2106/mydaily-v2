import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async (opts = {}) => {
    const s = opts.search ?? search;
    const p = opts.page ?? page;

    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/users", {
        params: { search: s, page: p, limit },
      });
      setUsers(res.data.users || []);
      setMeta({ total: res.data.total || 0, totalPages: res.data.totalPages || 1 });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    load({ search, page: 1 });
  };

  const toggleBan = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/ban`, { is_banned: !u.is_banned });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed");
    }
  };

  const toggleRole = async (u) => {
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: nextRole });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed");
    }
  };

  const togglePlan = async (u) => {
    const nextPlan = u.account_type === "PREMIUM" ? "FREE" : "PREMIUM";
    try {
      await api.patch(`/admin/users/${u.id}/plan`, { account_type: nextPlan });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Admin • Users</h2>

      <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 12px", borderRadius: 8 }}>
          Search
        </button>
      </form>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            Total: <b>{meta.total}</b>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: 10 }}>Email</th>
                  <th style={{ padding: 10 }}>Name</th>
                  <th style={{ padding: 10 }}>Role</th>
                  <th style={{ padding: 10 }}>Plan</th>
                  <th style={{ padding: 10 }}>Banned</th>
                  <th style={{ padding: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                    <td style={{ padding: 10 }}>{u.email}</td>
                    <td style={{ padding: 10 }}>{u.name}</td>
                    <td style={{ padding: 10 }}>{u.role}</td>
                    <td style={{ padding: 10 }}>{u.account_type}</td>
                    <td style={{ padding: 10 }}>{u.is_banned ? "Yes" : "No"}</td>
                    <td style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => toggleBan(u)} style={{ padding: "6px 10px", borderRadius: 8 }}>
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>

                      <button onClick={() => toggleRole(u)} style={{ padding: "6px 10px", borderRadius: 8 }}>
                        {u.role === "ADMIN" ? "Set USER" : "Set ADMIN"}
                      </button>

                      <button onClick={() => togglePlan(u)} style={{ padding: "6px 10px", borderRadius: 8 }}>
                        {u.account_type === "PREMIUM" ? "Set FREE" : "Set PREMIUM"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 12 }}>
                      No users
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>
              Page <b>{page}</b> / {meta.totalPages}
            </span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
