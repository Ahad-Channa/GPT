import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiShield, FiMessageCircle, FiHeadphones, FiUserPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_users',       label: 'Manage Users (Ban / Balance)' },
  { value: 'manage_withdrawals', label: 'Manage Withdrawals' },
  { value: 'manage_support',     label: 'Support Tickets' },
  { value: 'manage_chat',        label: 'Chat Moderation (Admin Panel)' },
  { value: 'manage_missions',    label: 'Missions Management' },
  { value: 'manage_offerwalls',  label: 'Offerwall Config + Promos + Proofs' },
  { value: 'manage_admins',      label: 'Manage Admins (Rare / Dangerous)' },
];

const ROLE_META = {
  admin:         { label: 'Admin',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)' },
  chat_mod:      { label: 'Chat Mod',      color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.25)' },
  support_agent: { label: 'Support Agent', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.25)' },
  moderator:     { label: 'Moderator',     color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.25)' },
  owner:         { label: 'Owner',         color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.25)' },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || { label: role, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100,
      background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
      textTransform: 'uppercase', letterSpacing: '0.05em'
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

  // Revoke admin
  const revokeAdmin = async (id) => {
    if (!window.confirm("Revoke this admin's access?")) return;
    setWorking(true);
    try {
      await fetch(`${API}/admin/admins/${id}`, { method: 'DELETE', headers: await authHeaders() });
      fetchStaff();
    } catch (err) { console.error(err); }
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
        <p className="admin-page-sub" style={{ color: '#f87171' }}>Only the Primary Admin can manage staff.</p>
      </div>
    );
  }

  const tabStyle = (tab) => ({
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '0.82rem', fontWeight: activeTab === tab ? 700 : 500,
    background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: activeTab === tab ? '#a5b4fc' : '#475569',
    transition: 'all 0.15s'
  });

  return (
    <div>
      <h1 className="admin-page-title">Staff Management</h1>
      <p className="admin-page-sub">Manage admins, chat moderators, and support agents.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
        <button style={tabStyle('admins')} onClick={() => { setActiveTab('admins'); setNewUserId(''); }}>
          <FiShield size={14} /> Admins ({admins.length})
        </button>
        <button style={tabStyle('chat_mods')} onClick={() => { setActiveTab('chat_mods'); setNewUserId(''); }}>
          <FiMessageCircle size={14} /> Chat Mods ({chatMods.length})
        </button>
        <button style={tabStyle('support_agents')} onClick={() => { setActiveTab('support_agents'); setNewUserId(''); }}>
          <FiHeadphones size={14} /> Support Agents ({supportAgents.length})
        </button>
      </div>

      {/* ─── ADMINS TAB ──────────────────────────────────── */}
      {activeTab === 'admins' && (
        <>
          <div className="admin-card">
            <h3 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem' }}>Promote or Mint Admin</h3>

            {/* Promote / Mint sub-tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
              <button className={`action-btn ${promoteMode === 'promote' ? 'primary' : ''}`} onClick={() => setPromoteMode('promote')}>
                Promote Existing User
              </button>
              <button className={`action-btn ${promoteMode === 'mint' ? 'primary' : ''}`} onClick={() => setPromoteMode('mint')}>
                Direct Credentials Minting
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                {promoteMode === 'promote' ? (
                  <>
                    <p style={{ color: '#a3a3a3', marginBottom: '0.75rem', fontSize: '0.85rem' }}>Enter the exact MongoDB Object ID of the user to promote to Admin.</p>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="User ID (e.g., 60f7a...)"
                      value={newUserId}
                      onChange={e => setNewUserId(e.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <p style={{ color: '#a3a3a3', marginBottom: '0.75rem', fontSize: '0.85rem' }}>Create a secure admin account bypassing normal signup. Password: 8+ chars, 1 special, 1 number.</p>
                    <input type="text" className="admin-input" placeholder="Admin Display Name" value={mintName} onChange={e => setMintName(e.target.value)} />
                    <input type="email" className="admin-input" placeholder="Secret Email Address" value={mintEmail} onChange={e => setMintEmail(e.target.value)} />
                    <input type="password" className="admin-input" placeholder="Complex Password" value={mintPassword} onChange={e => setMintPassword(e.target.value)} />
                  </>
                )}
              </div>

              {/* Permission checkboxes */}
              <div style={{ minWidth: '260px' }}>
                <p style={{ marginBottom: '0.5rem', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Permissions
                </p>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {AVAILABLE_PERMISSIONS.map(p => {
                    const perms = promoteMode === 'promote' ? newAdminPerms : mintPerms;
                    const setPerms = promoteMode === 'promote' ? setNewAdminPerms : setMintPerms;
                    return (
                      <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={perms.includes(p.value)}
                          onChange={() => setPerms(togglePerm(perms, p.value))}
                          style={{ transform: 'scale(1.1)', accentColor: '#6366f1' }}
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
                style={{ padding: '0.7rem 2rem', fontWeight: 700, opacity: working ? 0.6 : 1 }}
              >
                <FiUserPlus style={{ marginRight: '0.5rem' }} />
                {promoteMode === 'promote' ? 'Promote User → Admin' : 'Mint Admin Credentials'}
              </button>
            </div>
          </div>

          {/* Admins table */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 700 }}>Current Admins</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <FiRefreshCw size={14} />
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
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#475569' }}>Loading...</td></tr>
                  ) : admins.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#475569' }}>No admins found.</td></tr>
                  ) : admins.map(a => (
                    <tr key={a._id}>
                      <td>{a.displayName}</td>
                      <td>
                        {a.email}
                        {a.email === import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && (
                          <span className="super-badge" style={{ marginLeft: '8px' }}>You</span>
                        )}
                      </td>
                      <td><RoleBadge role={a.role} /></td>
                      <td>
                        {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {AVAILABLE_PERMISSIONS.map(p => (
                              <label key={p.value} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                                <input
                                  type="checkbox"
                                  checked={a.adminPermissions?.includes(p.value)}
                                  onChange={() => updatePermissions(a._id, togglePerm(a.adminPermissions || [], p.value))}
                                  style={{ accentColor: '#6366f1' }}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#4dff88', fontSize: '0.82rem' }}>Full Access (Unrestricted)</span>
                        )}
                      </td>
                      <td>
                        {a.email !== import.meta.env.VITE_PRIMARY_ADMIN_EMAIL && (
                          <button className="action-btn danger" onClick={() => revokeAdmin(a._id)}>
                            <FiTrash2 size={12} style={{ marginRight: '4px' }} /> Revoke
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
          <div className="admin-card">
            <h3 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '0.5rem' }}>Promote Chat Moderator</h3>
            <p style={{ color: '#64748b', fontSize: '0.84rem', marginBottom: '1rem' }}>
              Chat Mods get a <strong style={{ color: '#38bdf8' }}>MOD badge</strong> next to their VIP rank in live chat and can delete messages directly — without any admin panel access.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
                style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
              >
                <FiMessageCircle style={{ marginRight: '0.4rem' }} /> Promote to Chat Mod
              </button>
            </div>
          </div>

          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 700 }}>Current Chat Mods</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <FiRefreshCw size={14} />
              </button>
            </div>
            {loading ? (
              <p style={{ color: '#475569', textAlign: 'center' }}>Loading...</p>
            ) : chatMods.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center' }}>No chat moderators assigned yet.</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {chatMods.map(m => (
                      <tr key={m._id}>
                        <td>{m.displayName}</td>
                        <td>{m.email}</td>
                        <td><RoleBadge role={m.role} /></td>
                        <td>
                          <button className="action-btn danger" onClick={() => revokeChatMod(m._id)}>
                            <FiTrash2 size={12} style={{ marginRight: '4px' }} /> Revoke
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
          <div className="admin-card">
            <h3 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '0.5rem' }}>Promote Support Agent</h3>
            <p style={{ color: '#64748b', fontSize: '0.84rem', marginBottom: '1rem' }}>
              Support Agents can access the admin panel but <strong style={{ color: '#a78bfa' }}>only the Support tab</strong>. They cannot see Overview, Users, Withdrawals, or any other section.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
                style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
              >
                <FiHeadphones style={{ marginRight: '0.4rem' }} /> Promote to Support Agent
              </button>
            </div>
          </div>

          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 700 }}>Current Support Agents</h3>
              <button onClick={fetchStaff} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <FiRefreshCw size={14} />
              </button>
            </div>
            {loading ? (
              <p style={{ color: '#475569', textAlign: 'center' }}>Loading...</p>
            ) : supportAgents.length === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center' }}>No support agents assigned yet.</p>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    {supportAgents.map(a => (
                      <tr key={a._id}>
                        <td>{a.displayName}</td>
                        <td>{a.email}</td>
                        <td><RoleBadge role={a.role} /></td>
                        <td>
                          <button className="action-btn danger" onClick={() => revokeSupportAgent(a._id)}>
                            <FiTrash2 size={12} style={{ marginRight: '4px' }} /> Revoke
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
