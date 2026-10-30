import { useState } from 'react';
import { FiCheck, FiCopy, FiFileText, FiInfo, FiLink, FiShield } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API.replace(/\/api\/?$/, '');
const POSTBACK_ENDPOINT = `${BACKEND_URL}/api/direct-offers/postback`;

const codeBlock = 'bg-slate-950 text-slate-100 rounded-xl p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap';

const CopyButton = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
    >
      {copied ? <FiCheck className="text-emerald-300" /> : <FiCopy />}
      {copied ? 'Copied' : label}
    </button>
  );
};

const Section = ({ icon: Icon, title, children }) => (
  <section className="admin-card space-y-3">
    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
      {Icon && <Icon className="text-indigo-500" />}
      {title}
    </h2>
    {children}
  </section>
);

const AdminPartnerIntegration = () => {
  const singleStepTemplate = `${POSTBACK_ENDPOINT}?click_id={CLICK_ID}&txn_id={TRANSACTION_ID}&status=approved&payout={PAYOUT}&secret={OFFER_SECRET}`;
  const multiStepTemplate = `${POSTBACK_ENDPOINT}?click_id={CLICK_ID}&txn_id={TRANSACTION_ID}&status=approved&payout={PAYOUT}&event_type={EVENT_ID_OR_GOAL}&secret={OFFER_SECRET}`;
  const configurableTemplate = `${POSTBACK_ENDPOINT}?custom_click_param={CLICK_ID}&custom_txn_param={TRANSACTION_ID}&custom_status_param=approved&custom_payout_param={PAYOUT}&custom_event_param={EVENT_ID_OR_GOAL}&secret={OFFER_SECRET}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <FiLink /> Partner Integration
        </h1>
        <p className="admin-page-sub">
          Share this technical specification with partners before an offer exists. The final secret is generated per offer.
        </p>
      </div>

      <Section icon={FiLink} title="General Postback Endpoint">
        <p className="text-sm text-slate-600">
          Partners send conversions to this endpoint. It is the same endpoint for every Direct Offer; the secret identifies the offer.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <code className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs break-all">{POSTBACK_ENDPOINT}</code>
          <CopyButton value={POSTBACK_ENDPOINT} />
        </div>
      </Section>

      <Section icon={FiFileText} title="Supported Standard Fields">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>Purpose</th><th>Default parameter</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr><td>Click ID</td><td><code>click_id</code></td><td>Our click identifier. Partners must return it unchanged.</td></tr>
              <tr><td>Transaction ID</td><td><code>txn_id</code></td><td>Partner conversion ID. Must be unique per goal conversion.</td></tr>
              <tr><td>Status</td><td><code>status</code></td><td>Conversion lifecycle status.</td></tr>
              <tr><td>Payout</td><td><code>payout</code></td><td>Recorded advertiser revenue. The user reward always comes from the offer snapshot.</td></tr>
              <tr><td>Event / Event ID</td><td><code>event_type</code></td><td>Used for multi-step goals. Can be renamed per offer.</td></tr>
              <tr><td>Authentication</td><td><code>secret</code></td><td>Offer-specific shared secret.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Parameter names are customizable per offer. For example, a Plarium offer can use <code>event_id</code> instead of <code>event_type</code>.
        </p>
      </Section>

      <Section icon={FiShield} title="Supported Statuses">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><strong>pending</strong><br />Records the conversion without a reward.</div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><strong>approved</strong><br />Creates the reward through the central reward service.</div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><strong>rejected</strong><br />Records a no-credit rejection.</div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><strong>reversed / chargeback</strong><br />Reverses an already-credited conversion.</div>
        </div>
        <p className="text-xs text-slate-500">
          The exact incoming values for approved, rejected and reversed are configurable per offer in the offer mappings.
        </p>
      </Section>

      <Section icon={FiInfo} title="Single-Step Example">
        <p className="text-sm text-slate-600">Generic template — replace macros with real partner values.</p>
        <div className={codeBlock}>{singleStepTemplate}</div>
        <CopyButton value={singleStepTemplate} label="Copy single-step template" />
      </Section>

      <Section icon={FiInfo} title="Multi-Step Example">
        <p className="text-sm text-slate-600">
          Send one postback per completed goal. Use a unique transaction ID per goal, or the partner's event mapping identifies the goal.
        </p>
        <div className={codeBlock}>{multiStepTemplate}</div>
        <CopyButton value={multiStepTemplate} label="Copy multi-step template" />
        <p className="text-xs text-slate-500">
          If the offer uses a custom event parameter such as <code>event_id</code>, replace <code>event_type</code> in the template.
        </p>
        <div className={codeBlock}>{configurableTemplate}</div>
      </Section>

      <Section icon={FiShield} title="Authentication Note">
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li>The general structure on this page can be shared before an offer is created.</li>
          <li>The final offer-specific secret is generated when the offer exists.</li>
          <li>Therefore <code>{'{OFFER_SECRET}'}</code> remains a placeholder in this generic guide.</li>
          <li>The real secret is stored server-side and is only shown on demand in the offer's postback URL.</li>
        </ul>
      </Section>

      <Section icon={FiFileText} title="Event Mapping Explanation">
        <div className="space-y-2 text-sm text-slate-700">
          <p><strong>A. Internal goal keys.</strong> We define safe internal keys such as <code>fight_20_battles</code>. The partner can send that key as the event value.</p>
          <p><strong>B. External partner Event IDs.</strong> The partner may send values such as <code>Game Event 269</code>, <code>Game Event 4</code> or <code>Game Event 112</code>. These external values can be mapped to internal goals once commercial and technical requirements are agreed.</p>
          <p className="text-xs text-slate-500">
            Resolution order: exact internal goal key → exact external Event ID → exact alias → safe normalized fallback. Unknown or ambiguous events never reward.
          </p>
        </div>
      </Section>
    </div>
  );
};

export default AdminPartnerIntegration;
