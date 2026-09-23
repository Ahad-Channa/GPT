import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiShield, FiMessageCircle, FiHeadphones, FiUserPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_users',       label: 'Manage Users (Ban / Balance)' },
  { value: 'manage_withdrawals', label: 'Manage Withdrawals' },
  { value: 'manage_support',     label: 'Support Tickets' },
  { value: 'manage_chat',        label: 'Chat Moderation (Admin Panel)' },
  { value: 'manage_offerwalls',  label: 'Offerwall Config + Promos + Featured Offers' },
  { value: 'manage_admins',      label: 'Manage Admins (Rare / Dangerous)' },
];

const ROLE_META = {
  admin:         { label: 'Admin',         color: '#DC2626', bg: '#FEF2F2', border: '#FEE2E2' },
  chat_mod:      { label: 'Chat Mod',      color: '#0284C7', bg: '#F0F9FF', border: '#E0F2FE' },
  support_agent: { label: 'Support Agent', color: '#7C3AED', bg: '#F5F3FF', border: '#EDE9FE' },
  moderator:     { label: 'Moderator',     color: '#059669', bg: '#ECFDF5', border: '#D1FAE5' },
  owner:         { label: 'Owner',         color: '#D97706', bg: '#FFFBEB', border: '#FEF3C7' },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || { label: role, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 100,
      background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
      textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {meta.label}
    </span>
  );
};

const AdminStaff = () => {
  const { currentUser, isPrimaryAdmin } = useAuth();
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'chat_mods' | 'support_agents'

  // Promote/mint form state
  const [promoteMode, setPromoteMode] = useState('promote'); // 'promote' | 'mint'
  const [newUserId, setNewUserId] = useState('');
  const [newAdminPerms, setNewAdminPerms] = useState([]);
  const [mintEmail, setMintEmail] = useState('');
  const [mintPassword, setMintPassword] = useState('');
  const [mintName, setMintName] = useState('');
  const [mintPerms, setMintPerms] = useState([]);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (isPrimaryAdmin) fetchStaff();
  }, [isPrimaryAdmin]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/admins`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAllStaff(data.admins);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const authHeaders = async () => {
    const token = await currentUser.getIdToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  // Promote to admin
  const promoteAdmin = async () => {
    if (!newUserId) return alert('Enter User ID');
    setWorking(true);
    try {
      const res = await fetch(`${API}/admin/admins`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ userId: newUserId, permissions: newAdminPerms })
      });
      if (res.ok) { setNewUserId(''); setNewAdminPerms([]); fetchStaff(); alert('Admin promoted!'); }
      else { const e = await res.json(); alert('Failed: ' + e.error); }
    } catch (err) { console.error(err); }
    setWorking(false);
  };

  // Mint admin credentials
  const mintAdmin = async () => {
    if (!mintEmail || !mintPassword || !mintName) return alert('Fill out all fields');
    if (mintPassword.length < 8) return alert('Password must be at least 8 characters');
    setWorking(true);
    try {
      const res = await fetch(`${API}/admin/create-admin-credentials`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email: mintEmail, password: mintPassword, displayName: mintName, permissions: mintPerms })
      });
      if (res.ok) { setMintEmail(''); setMintPassword(''); setMintName(''); setMintPerms([]); fetchStaff(); alert('Admin credentials minted!'); }
      else { const e = await res.json(); alert('Failed: ' + e.error); }
    } catch (err) { console.error(err); }
    setWorking(false);
  };

  // Revoke admin — demote back to normal user
  const revokeAdmin = async (id) => {
    if (!window.confirm("Revoke this admin's access? They will become a normal user.")) return;
    setWorking(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchStaff();
      } else {
        alert('Failed to revoke: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Revoke error:', err);
      alert('Network error — check console');
    }
    setWorking(false);
  };

  // Update admin permissions
  const updatePermissions = async (adminId, permissions) => {
    try {
      await fetch(`${API}/admin/admins/${adminId}/permissions`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ permissions })
      });
      fetchStaff();
    } catch (err) { console.error(err); }
  };

  // Promote to chat_mod
  const promoteChatMod = async () => {
    if (!newUserId) return alert('Enter User ID');
    setWorking(true);
    try {
      const res = await fetch(`${API}/admin/chat-mods`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ userId: newUserId })
      });
      if (res.ok) { setNewUserId(''); fetchStaff(); alert('Chat Mod promoted!'); }
      else { const e = await res.json(); alert('Failed: ' + e.error); }
    } catch (err) { console.error(err); }
    setWorking(false);
  };

  // Revoke chat_mod
  const revokeChatMod = async (id) => {
    if (!window.confirm("Remove this Chat Mod?")) return;
    await fetch(`${API}/admin/chat-mods/${id}`, { method: 'DELETE', headers: await authHeaders() });
    fetchStaff();
  };

  // Promote to support_agent
  const promoteSupportAgent = async () => {
    if (!newUserId) return alert('Enter User ID');
    setWorking(true);
    try {
      const res = await fetch(`${API}/admin/support-agents`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ userId: newUserId })
      });
      if (res.ok) { setNewUserId(''); fetchStaff(); alert('Support Agent promoted!'); }
      else { const e = await res.json(); alert('Failed: ' + e.error); }
    } catch (err) { console.error(err); }
    setWorking(false);
  };

  // Revoke support_agent
  const revokeSupportAgent = async (id) => {
    if (!window.confirm("Remove this Support Agent?")) return;
    await fetch(`${API}/admin/support-agents/${id}`, { method: 'DELETE', headers: await authHeaders() });
    fetchStaff();
  };

  const togglePerm = (perms, val) => perms.includes(val) ? perms.filter(p => p !== val) : [...perms, val];

  const admins = allStaff.filter(u => u.role === 'admin' || u.role === 'owner');
  const chatMods = allStaff.filter(u => u.role === 'chat_mod' || u.role === 'moderator');
  const supportAgents = allStaff.filter(u => u.role === 'support_agent');

  if (!isPrimaryAdmin) {
    return (
      <div>
        <h1 className="admin-page-title">Access Denied</h1>
        <p className="admin-page-sub" style={{ color: '#DC2626' }}>Only the Primary Admin can manage staff.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">Staff Management</h1>
      <p className="admin-page-sub">Manage admins, chat moderators, and support agents.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className={`filter-pill ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => { setActiveTab('admins'); setNewUserId(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiShield size={14} /> Admins ({admins.length})
        </button>
        <button
          className={`filter-pill ${activeTab === 'chat_mods' ? 'active' : ''}`}
          onClick={() => { setActiveTab('chat_mods'); setNewUserId(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiMessageCircle size={14} /> Chat Mods ({chatMods.length})
        </button>
        <button
          className={`filter-pill ${activeTab === 'support_agents' ? 'active' : ''}`}
          onClick={() => { setActiveTab('support_agents'); setNewUserId(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiHeadphones size={14} /> Support Agents ({supportAgents.length})
        </button>
      </div>

      {/* ─── ADMINS TAB ──────────────────────────────────── */}
      {activeTab === 'admins' && (
        <>
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: '1rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Promote or Mint Admin</h3>

            {/* Promote / Mint sub-tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' }}>
              <button
                className={`filter-pill ${promoteMode === 'promote' ? 'active' : ''}`}
                onClick={() => setPromoteMode('promote')}
              >
                Promote Existing User
              </button>
              <button
                className={`filter-pill ${promoteMode === 'mint' ? 'active' : ''}`}
                onClick={() => setPromoteMode('mint')}
              >
                Direct Credentials Minting
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                {promoteMode === 'promote' ? (
                  <>
                    <p style={{ color: '#6B7280', marginBottom: '0.75rem', fontSize: '0.85rem' }}>Enter the exact MongoDB Object ID of the user to promote to Admin.</p>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="User ID (e.g., 60f7a...)"
                      value={newUserId}
                      onChange={e => setNewUserId(e.target.value)}
                    />
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ color: '#6B7280', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Create a secure admin account bypassing normal signup. Password: 8+ chars, 1 special, 1 number.</p>
                    <input type="text" className="admin-input" placeholder="Admin Display Name" value={mintName} onChange={e => setMintName(e.target.value)} />
                    <input type="email" className="admin-input" placeholder="Secret Email Address" value={mintEmail} onChange={e => setMintEmail(e.target.value)} />
                    <input type="password" className="admin-input" placeholder="Complex Password" value={mintPassword} onChange={e => setMintPassword(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Permission checkboxes */}
              <div style={{ minWidth: '280px' }}>
                <p style={{ marginBottom: '0.5rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Permissions
                </p>
                <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                  {AVAILABLE_PERMISSIONS.map(p => {
                    const perms = promoteMode === 'promote' ? newAdminPerms : mintPerms;
                    const setPerms = promoteMode === 'promote' ? setNewAdminPerms : setMintPerms;
                    return (
                      <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={perms.includes(p.value)}
                          onChange={() => setPerms(togglePerm(perms, p.value))}
                          style={{ accentColor: '#1E2538' }}
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                className="action-btn primary"
                onClick={promoteMode === 'promote' ? promoteAdmin : mintAdmin}
                disabled={working}
                style={{ padding: '0.7rem 1.75rem', fontWeight: 700, opacity: working ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FiUserPlus />
                {promoteMode === 'promote' ? 'Promote User → Admin' : 'Mint Admin Credentials'}
              </button>
            </div>
          </div>

          {/* Admins table */}
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
              <h3 style={{ color: '#111827', fontWeight: 700, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Current Admins</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="loading-row"><td colSpan="5">Loading staff members...</td></tr>
                  ) : admins.length === 0 ? (
                    <tr className="loading-row"><td colSpan="5">No admins found.</td></tr>
                  ) : admins.map(a => (
                    <tr key={a._id}>
                      <td style={{ fontWeight: 600, color: '#111827' }}>{a.displayName}</td>
                      <td>
                        <span style={{ color: '#4B5563' }}>{a.email}</span>
                        {a.email === import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && (
                          <span style={{ marginLeft: '8px', padding: '2px 7px', background: '#1E2538', color: '#FFFFFF', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>You</span>
                        )}
                      </td>
                      <td><RoleBadge role={a.role} /></td>
                      <td>
                        {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {AVAILABLE_PERMISSIONS.map(p => (
                              <label key={p.value} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4B5563', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={a.adminPermissions?.includes(p.value)}
                                  onChange={() => updatePermissions(a._id, togglePerm(a.adminPermissions || [], p.value))}
                                  style={{ accentColor: '#1E2538' }}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 600 }}>Full Access (Unrestricted)</span>
                        )}
                      </td>
                      <td>
                        {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && (
                          <button className="action-btn danger" onClick={() => revokeAdmin(a._id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FiTrash2 size={12} /> Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── CHAT MODS TAB ──────────────────────────────── */}
      {activeTab === 'chat_mods' && (
        <>
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: '0.5rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Promote Chat Moderator</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Chat Mods get a <strong style={{ color: '#0284C7' }}>MOD badge</strong> next to their VIP rank in live chat and can delete messages directly — without any admin panel access.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="admin-input"
                placeholder="User ID (MongoDB ObjectId)"
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                style={{ flex: '1', minWidth: '260px', marginBottom: 0 }}
              />
              <button
                className="action-btn primary"
                onClick={promoteChatMod}
                disabled={working || !newUserId}
                style={{ padding: '0.65rem 1.5rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FiMessageCircle /> Promote to Chat Mod
              </button>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
              <h3 style={{ color: '#111827', fontWeight: 700, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Current Chat Mods</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>
            {loading ? (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>Loading...</p>
            ) : chatMods.length === 0 ? (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>No chat moderators assigned yet.</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {chatMods.map(m => (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 600, color: '#111827' }}>{m.displayName}</td>
                        <td style={{ color: '#4B5563' }}>{m.email}</td>
                        <td><RoleBadge role={m.role} /></td>
                        <td>
                          <button className="action-btn danger" onClick={() => revokeChatMod(m._id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FiTrash2 size={12} /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── SUPPORT AGENTS TAB ─────────────────────────── */}
      {activeTab === 'support_agents' && (
        <>
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: '0.5rem', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Promote Support Agent</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Support Agents can access the admin panel but <strong style={{ color: '#7C3AED' }}>only the Support tab</strong>. They cannot see Overview, Users, Withdrawals, or any other section.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="admin-input"
                placeholder="User ID (MongoDB ObjectId)"
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                style={{ flex: '1', minWidth: '260px', marginBottom: 0 }}
              />
              <button
                className="action-btn primary"
                onClick={promoteSupportAgent}
                disabled={working || !newUserId}
                style={{ padding: '0.65rem 1.5rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FiHeadphones /> Promote to Support Agent
              </button>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
              <h3 style={{ color: '#111827', fontWeight: 700, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Current Support Agents</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>
            {loading ? (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>Loading...</p>
            ) : supportAgents.length === 0 ? (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>No support agents assigned yet.</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {supportAgents.map(a => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 600, color: '#111827' }}>{a.displayName}</td>
                        <td style={{ color: '#4B5563' }}>{a.email}</td>
                        <td><RoleBadge role={a.role} /></td>
                        <td>
                          <button className="action-btn danger" onClick={() => revokeSupportAgent(a._id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FiTrash2 size={12} /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStaff;

