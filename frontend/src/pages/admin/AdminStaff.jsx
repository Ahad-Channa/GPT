import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_users', label: 'Manage Users (Ban/Bal+/Bal-)' },
  { value: 'manage_withdrawals', label: 'Manage Withdrawals' },
  { value: 'manage_support', label: 'Support / Chat Mod' },
  { value: 'manage_offerwalls', label: 'Offerwall Config' },
  { value: 'manage_admins', label: 'Manage Admins (Rare)' }
];

const AdminStaff = () => {
  const { currentUser, isPrimaryAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('promote'); // or 'mint'

  // Form State
  const [newAdminId, setNewAdminId] = useState('');
  const [mintEmail, setMintEmail] = useState('');
  const [mintPassword, setMintPassword] = useState('');
  const [mintName, setMintName] = useState('');

  const [newAdminPerms, setNewAdminPerms] = useState([]);

  useEffect(() => {
    if (isPrimaryAdmin) {
      fetchAdmins();
    }
  }, [isPrimaryAdmin]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/admins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAdmins(data.admins);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const promoteAdmin = async () => {
    if (!newAdminId) return alert('Enter User ID');
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: newAdminId, permissions: newAdminPerms })
      });
      if (res.ok) {
        setNewAdminId('');
        setNewAdminPerms([]);
        fetchAdmins();
        alert('Admin successfully promoted!');
      } else {
        const error = await res.json();
        alert('Failed: ' + error.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const mintAdmin = async () => {
    if (!mintEmail || !mintPassword || !mintName) return alert('Fill out all fields');
    if (mintPassword.length < 8) return alert('Password must be at least 8 characters');

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/create-admin-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: mintEmail,
          password: mintPassword,
          displayName: mintName,
          permissions: newAdminPerms
        })
      });

      if (res.ok) {
        setMintEmail('');
        setMintPassword('');
        setMintName('');
        setNewAdminPerms([]);
        fetchAdmins();
        alert('Successfully minted new Admin Account!');
      } else {
        const error = await res.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const revokeAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to completely revoke this admin's access?")) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const updatePermissions = async (adminId, permissions) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/api/admin/admins/${adminId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePermission = (existingPerms, permValue) => {
    if (existingPerms.includes(permValue)) {
      return existingPerms.filter(p => p !== permValue);
    } else {
      return [...existingPerms, permValue];
    }
  };

  if (!isPrimaryAdmin) {
    return (
      <div>
        <h1 className="admin-page-title">Access Denied</h1>
        <p className="admin-page-sub" style={{ color: '#f87171' }}>You must be the Primary Admin to access this section.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">Staff Management</h1>
      <p className="admin-page-sub">Promote users, mint admin credentials and manage permissions.</p>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <button
            className={`action-btn ${activeTab === 'promote' ? 'primary' : ''}`}
            onClick={() => setActiveTab('promote')}
          >
            Promote Existing User
          </button>
          <button
            className={`action-btn ${activeTab === 'mint' ? 'primary' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            Direct Credentials Minting
          </button>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

          <div style={{ flex: 1, minWidth: '280px' }}>
            {activeTab === 'promote' ? (
              <>
                <p style={{ color: '#a3a3a3', marginBottom: '1rem' }}>Enter the exact MongoDB Object ID of the user you wish to promote to admin.</p>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="User ID (e.g., 60f7a...)"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                />
              </>
            ) : (
              <>
                <p style={{ color: '#a3a3a3', marginBottom: '1rem' }}>Generate an administrator account securely bypassing normal signup flow. Passwords must be 8+ chars linking to a special symbol and number.</p>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Admin Name (e.g., Moderator1)"
                  value={mintName}
                  onChange={(e) => setMintName(e.target.value)}
                />
                <input
                  type="email"
                  className="admin-input"
                  placeholder="Secret Email Address"
                  value={mintEmail}
                  onChange={(e) => setMintEmail(e.target.value)}
                />
                <input
                  type="password"
                  className="admin-input"
                  placeholder="Complex Password"
                  value={mintPassword}
                  onChange={(e) => setMintPassword(e.target.value)}
                />
              </>
            )}
          </div>

          <div style={{ minWidth: '250px' }}>
            <p style={{ marginBottom: '0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Initial Permissions</p>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p.value} style={{ display: 'block', marginBottom: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newAdminPerms.includes(p.value)}
                    onChange={() => setNewAdminPerms(togglePermission(newAdminPerms, p.value))}
                    style={{ marginRight: '0.8rem', transform: 'scale(1.2)' }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="action-btn primary"
            onClick={activeTab === 'promote' ? promoteAdmin : mintAdmin}
            style={{ padding: '0.8rem 2rem', fontWeight: 'bold' }}
          >
            {activeTab === 'promote' ? 'Promote User -> Admin' : 'Mint Admin Credentials & Save'}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem', fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>Current Admins</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Email</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4">Loading...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan="4">No admins found.</td></tr>
              ) : (
                admins.map(a => (
                  <tr key={a._id}>
                    <td>{a.displayName}</td>
                    <td>{a.email} {a.email === import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && <span className="super-badge" style={{ marginLeft: '10px' }}>You</span>}</td>
                    <td>
                      {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {AVAILABLE_PERMISSIONS.map(p => (
                            <label key={p.value} style={{ fontSize: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={a.adminPermissions?.includes(p.value)}
                                onChange={(e) => updatePermissions(a._id, togglePermission(a.adminPermissions || [], p.value))}
                                style={{ transform: 'scale(0.8)', marginRight: '0.3rem' }}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#4dff88' }}>Full Access (Unrestricted)</span>
                      )}
                    </td>
                    <td>
                      {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && (
                        <button className="action-btn danger" onClick={() => revokeAdmin(a._id)}>Revoke Admin</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStaff;
