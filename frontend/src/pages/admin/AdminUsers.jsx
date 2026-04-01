import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiCopy, FiSearch } from 'react-icons/fi';

const AdminUsers = () => {
  const { currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`http://localhost:5000/api/admin/users?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleBan = async (userId, currentState) => {
    if (!window.confirm(`${currentState ? 'Unban' : 'Ban'} this user?`)) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !currentState, reason: 'Admin Action' }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const adjustBalance = async (userId) => {
    const amountStr = window.prompt('Enter amount to adjust (negative to deduct):');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount)) { alert('Invalid amount'); return; }
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: 'Admin Manual Correction' }),
      });
      if (res.ok) fetchUsers();
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <h1 className="admin-page-title">User Management</h1>
      <p className="admin-page-sub">View, search and moderate platform users.</p>

      {/* Search */}
      <div className="admin-search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px' }} />
          <input
            type="text"
            className="admin-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="action-btn primary" onClick={fetchUsers}>
          Search
        </button>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="7">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan="7">No users found.</td>
                </tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                        {u._id.substring(0, 10)}...
                      </span>
                      <button
                        onClick={() => copyToClipboard(u._id)}
                        title="Copy ID"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0 }}
                      >
                        <FiCopy size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ color: '#cbd5e1', fontWeight: 500 }}>{u.displayName || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === 'admin'
                      ? <span className="super-badge">{u.role}</span>
                      : <span style={{ color: '#475569' }}>{u.role}</span>
                    }
                  </td>
                  <td style={{ fontFamily: 'monospace', color: '#818cf8' }}>{u.walletBalance}</td>
                  <td>
                    {u.isBanned
                      ? <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>● Banned</span>
                      : <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>● Active</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="action-btn" onClick={() => adjustBalance(u._id)}>Adjust Bal</button>
                      <button
                        className={`action-btn ${u.isBanned ? 'success' : 'danger'}`}
                        onClick={() => toggleBan(u._id, u.isBanned)}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
