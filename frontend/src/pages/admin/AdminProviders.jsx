import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiRefreshCw, FiSave, FiShield, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const emptyForm = {
  providerId: '',
  name: '',
  label: '',
  type: 'offerwall',
  enabled: false,
  parameterMappings: {
    clickId: 'click_id',
    transactionId: 'transaction_id',
    status: 'status',
    payout: 'payout',
    eventType: 'event_type',
    providerUserId: 'user_id',
  },
  statusMappings: {
    pending: 'pending',
    approved: 'approved, completed',
    rejected: 'rejected, declined',
    reversal: 'reversed, chargeback',
  },
  security: {
    method: 'none',
    signatureParam: '',
    tokenParam: '',
    headerName: '',
    hashTemplate: '',
    caseInsensitiveSignature: false,
    ipAllowlistRequired: false,
  },
  responseConfig: {
    successStatus: 200,
    successBody: '1',
    duplicateStatus: 200,
    duplicateBody: '1',
    errorStatus: 200,
    errorBody: '0',
  },
  ipAllowlist: '',
  secret: '',
};

const splitAliases = (value) => String(value || '').split(',').map(v => v.trim()).filter(Boolean);
const joinAliases = (value) => Array.isArray(value) ? value.join(', ') : '';

const ProviderForm = ({ selected, token, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm);
      return;
    }
    setForm({
      ...emptyForm,
      ...selected,
      parameterMappings: { ...emptyForm.parameterMappings, ...(selected.parameterMappings || {}) },
      statusMappings: {
        pending: joinAliases(selected.statusMappings?.pending),
        approved: joinAliases(selected.statusMappings?.approved),
        rejected: joinAliases(selected.statusMappings?.rejected),
        reversal: joinAliases(selected.statusMappings?.reversal),
      },
      security: { ...emptyForm.security, ...(selected.security || {}) },
      responseConfig: { ...emptyForm.responseConfig, ...(selected.responseConfig || {}) },
      ipAllowlist: (selected.ipAllowlist || []).join(', '),
      secret: '',
    });
  }, [selected]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const setNested = (group, key, value) => setForm(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        providerId: form.providerId,
        name: form.name,
        label: form.label,
        type: form.type,
        enabled: form.enabled,
        parameterMappings: form.parameterMappings,
        statusMappings: {
          pending: splitAliases(form.statusMappings.pending),
          approved: splitAliases(form.statusMappings.approved),
          rejected: splitAliases(form.statusMappings.rejected),
          reversal: splitAliases(form.statusMappings.reversal),
        },
        security: form.security,
        responseConfig: {
          successStatus: Number(form.responseConfig.successStatus),
          successBody: form.responseConfig.successBody,
          duplicateStatus: Number(form.responseConfig.duplicateStatus),
          duplicateBody: form.responseConfig.duplicateBody,
          errorStatus: Number(form.responseConfig.errorStatus),
          errorBody: form.responseConfig.errorBody,
        },
        ipAllowlist: splitAliases(form.ipAllowlist),
      };
      if (form.secret.trim()) payload.secret = form.secret.trim();

      const isEdit = Boolean(selected?._id);
      const res = await fetch(`${API}/admin/provider-configs${isEdit ? `/${selected.providerId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Provider save failed');
      onSaved();
      setForm(prev => ({ ...prev, secret: '' }));
    } catch (err) {
      setError(err.message || 'Provider save failed');
    } finally {
      setSaving(false);
    }
  };

  const input = 'admin-input';
  return (
    <form className="admin-card" onSubmit={save}>
      <h2 className="text-white font-bold mb-4">{selected ? `Edit ${selected.providerId}` : 'New Provider Config'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className={input} value={form.providerId} disabled={Boolean(selected)} onChange={e => set('providerId', e.target.value)} placeholder="provider_id" />
        <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Provider name" />
        <select className={input} value={form.type} onChange={e => set('type', e.target.value)}>
          {['offerwall', 'direct', 'affiliate_network', 'advertiser', 'internal'].map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        {Object.entries(form.parameterMappings).map(([key, value]) => (
          <input key={key} className={input} value={value || ''} onChange={e => setNested('parameterMappings', key, e.target.value)} placeholder={`${key} param`} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
        {Object.entries(form.statusMappings).map(([key, value]) => (
          <input key={key} className={input} value={value || ''} onChange={e => setNested('statusMappings', key, e.target.value)} placeholder={`${key} aliases`} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
        <select className={input} value={form.security.method} onChange={e => setNested('security', 'method', e.target.value)}>
          {['none', 'shared_secret', 'token', 'hmac', 'md5', 'sha1', 'sha256', 'sha512', 'custom_adapter'].map(method => <option key={method} value={method}>{method}</option>)}
        </select>
        <input className={input} value={form.security.tokenParam || ''} onChange={e => setNested('security', 'tokenParam', e.target.value)} placeholder="token param" />
        <input className={input} value={form.security.signatureParam || ''} onChange={e => setNested('security', 'signatureParam', e.target.value)} placeholder="signature param" />
        <input className={input} type="password" value={form.secret} onChange={e => set('secret', e.target.value)} placeholder={selected?.security?.credentialsConfigured ? 'Replace secret' : 'Set secret'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <input className={input} value={form.security.hashTemplate || ''} onChange={e => setNested('security', 'hashTemplate', e.target.value)} placeholder="hash template or leave blank" />
        <input className={input} value={form.ipAllowlist || ''} onChange={e => set('ipAllowlist', e.target.value)} placeholder="IP allowlist, comma separated" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} /> Enabled
        </label>
      </div>

      <p className="text-xs text-slate-500 mt-3">Secrets are write-only. Blank secret fields preserve the existing credential.</p>
      {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
      <button className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-2" disabled={saving}>
        <FiSave /> {saving ? 'Saving...' : 'Save Provider'}
      </button>
    </form>
  );
};

const AdminProviders = () => {
  const { currentUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  const load = useCallback(async () => {
    if (!currentUser) return;
    const idToken = await currentUser.getIdToken();
    setToken(idToken);
    setLoading(true);
    const res = await fetch(`${API}/admin/provider-configs?limit=100`, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = await res.json();
    setProviders(data.providers || []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><FiShield /> Provider Configs</h1>
          <p className="admin-page-sub">Generic tracking provider setup. Credentials are never displayed.</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2"><FiRefreshCw className={loading ? 'spin' : ''} /> Refresh</button>
      </div>

      <ProviderForm selected={selected} token={token} onSaved={load} />

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Provider</th><th>Type</th><th>Status</th><th>Security</th><th>Credential</th><th></th></tr></thead>
          <tbody>
            {providers.map(provider => (
              <tr key={provider.providerId}>
                <td><strong>{provider.providerId}</strong><br /><span>{provider.name}</span></td>
                <td>{provider.type}</td>
                <td>{provider.enabled ? <FiToggleRight className="text-emerald-400" /> : <FiToggleLeft className="text-slate-500" />}</td>
                <td>{provider.security?.method || 'none'}</td>
                <td>{provider.security?.credentialsConfigured ? 'Configured' : 'Not set'}</td>
                <td><button className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300" onClick={() => setSelected(provider)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProviders;
