import { useState } from 'react';
import { FiActivity, FiBookOpen, FiCheckCircle, FiExternalLink } from 'react-icons/fi';

const link = 'text-indigo-600 font-semibold underline';

const H = ({ children }) => (
  <h3 className="text-sm font-bold text-slate-900 mt-4 mb-1">{children}</h3>
);

const Step = ({ number, title, children }) => (
  <div className="flex gap-3">
    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="text-xs text-slate-600 mt-0.5 space-y-1">{children}</div>
    </div>
  </div>
);

const PostbackGuide = () => (
  <div className="space-y-3">
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
      Diese Anleitung ist für Einsteiger. Alle Aktionen werden im Admin-Bereich unter
      {' '}<a className={link} href="/admin/direct-offers">Direct Offers</a> durchgeführt.
    </div>

    <H>Einzel-Schritt Direct Offer testen</H>
    <Step number="1" title="Angebot erstellen oder finden">
      <p>Admin → <a className={link} href="/admin/direct-offers">Direct Offers</a> → „New Offer“.</p>
      <p>Als Offer Type „Postback Offer“ wählen und speichern.</p>
    </Step>
    <Step number="2" title="Advertiser URL und Postback-Einstellungen kopieren">
      <p>In der Offer-Karte auf „Show & Copy Postback URL“ klicken.</p>
      <p>Die angezeigten Parameter (Click ID, Transaction ID, Status, Payout, Event/Goal, Secret) notieren.</p>
    </Step>
    <Step number="3" title="Als Nutzer anmelden und Angebot starten">
      <p>Im normalen Nutzerbereich unter <a className={link} href="/dashboard/earn">Verdienen</a> das Angebot öffnen und „Start Offer“ klicken.</p>
    </Step>
    <Step number="4" title="Click ID finden">
      <p>Admin → Direct Offers → in der Offer-Karte „Click Logs“ öffnen.</p>
      <p>Dort steht die Click ID des Nutzers. Kopieren-Button neben der ID benutzen.</p>
    </Step>
    <Step number="5" title="Postback-URL vorbereiten">
      <p>Die kopierte Postback-URL aus Schritt 2 verwenden. Sie enthält bereits den echten Offer-Secret.</p>
      <p>Makros durch echte Werte ersetzen.</p>
    </Step>
    <Step number="6" title="Eindeutige Transaction ID erzeugen">
      <p>Zum Beispiel: <code>TEST-2026-001</code> oder <code>TEST-{'{'}Date.now(){'}'}</code>. Für jeden Test eine neue ID verwenden.</p>
    </Step>
    <Step number="7" title="Approved Postback auslösen">
      <p>Beispiel im Browser oder per curl:</p>
      <div className="bg-slate-950 text-slate-100 rounded-lg p-2 font-mono text-[11px] overflow-x-auto">
        /api/direct-offers/postback?click_id=DEINE_CLICK_ID&amp;txn_id=TEST-2026-001&amp;status=approved&amp;payout=1.00&amp;secret=DEIN_OFFER_SECRET
      </div>
    </Step>
    <Step number="8" title="Ergebnis prüfen">
      <p>Admin → <a className={link} href="/admin/conversions">Conversions</a>: neue Conversion mit Status approved.</p>
      <p>Admin → <a className={link} href="/admin/postback-logs">Postback Logs</a>: Eintrag mit processingResult accepted.</p>
      <p>Nutzer → <a className={link} href="/dashboard/wallet">Wallet</a>: Transaction mit Angebotsnamen.</p>
      <p>Wallet-Guthaben und Live Feed prüfen.</p>
    </Step>

    <H>Rejected Test</H>
    <p className="text-xs text-slate-600">Status <code>rejected</code> senden. Es darf keine Gutschrift entstehen. Conversion und Postback Log müssen rejected anzeigen, das Wallet bleibt unverändert.</p>

    <H>Chargeback Test</H>
    <p className="text-xs text-slate-600">
      Zuerst einen approved Test durchführen. Danach denselben Click/Transaction mit Status <code>reversed</code> (oder dem konfigurierten Chargeback-Wert) senden.
      Prüfen: negative Chargeback-Transaction, Wallet-Abzug bzw. Hold-Auflösung, Conversion reversed, Postback Log mit reversal.
    </p>

    <H>Multi-Step Test</H>
    <Step number="1" title="Goals konfigurieren">
      <p>Im Offer Multi-step Goals anlegen. Für Partner-Events zusätzlich „External Event ID“ und optional Aliase setzen, z. B. <code>Game Event 269</code>.</p>
    </Step>
    <Step number="2" title="Event-Parameter setzen">
      <p>Unter Postback Parameter Mapping den „Event / Goal Parameter“ setzen, z. B. <code>event_id</code> für Plarium.</p>
    </Step>
    <Step number="3" title="Einen Click erzeugen">
      <p>Angebot als Nutzer starten und Click ID aus den Click Logs kopieren.</p>
    </Step>
    <Step number="4" title="Einzelne Events senden">
      <p>Pro Ziel einen eigenen Postback mit eindeutiger Transaction ID senden, z. B. <code>event_id=Game Event 269</code>.</p>
      <p>Jedes Ziel muss separat belohnt werden.</p>
    </Step>
    <Step number="5" title="Duplikat testen">
      <p>Denselben Postback erneut senden. Es darf keine zweite Gutschrift geben.</p>
    </Step>
  </div>
);

const LootablyGuide = () => (
  <div className="space-y-3">
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900">
      Lootably ist ein bestehender Offerwall-Anbieter. Diese Anleitung ändert die Integration nicht.
    </div>

    <H>Wo sind die Lootably Einstellungen?</H>
    <Step number="1" title="Admin → Offerwalls">
      <p>Unter <a className={link} href="/admin/offerwalls">Offerwalls</a> die Lootably-Karte aktivieren/deaktivieren und Reihenfolge/Hold prüfen.</p>
      <p>Placement ID, iframe URL und Secret kommen aus der Lootably-Konfiguration bzw. den <code>LOOTABLY_*</code> Umgebungsvariablen. Secrets niemals weitergeben.</p>
    </Step>
    <Step number="2" title="Placement ID">
      <p>Die Placement ID wird beim Öffnen der Wall an Lootably übergeben. Falsche Placement ID → Wall öffnet, aber keine passenden Angebote.</p>
    </Step>
    <Step number="3" title="SID / User-ID">
      <p>Die TaskMint User-ID wird als <code>sid</code> an Lootably übergeben. Fehlt die SID, kann der Postback nicht zugeordnet werden.</p>
    </Step>
    <Step number="4" title="Wall öffnen">
      <p>Als Nutzer unter <a className={link} href="/dashboard/earn">Verdienen</a> Lootably auswählen. Die Wall öffnet im Iframe; über den externen Link-Button auch in einem neuen Tab.</p>
    </Step>
    <Step number="5" title="Conversion prüfen">
      <p>Nach Abschluss: Admin → <a className={link} href="/admin/postback-logs">Postback Logs</a> nach Lootably filtern.</p>
      <p>Danach <a className={link} href="/admin/conversions">Conversions</a>, Nutzer-<a className={link} href="/dashboard/wallet">Wallet</a> und Transaction prüfen.</p>
    </Step>

    <H>Häufige Probleme</H>
    <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
      <li><strong>Wall öffnet, aber keine Angebote:</strong> Placement ID, Geo oder Gerätefilter prüfen.</li>
      <li><strong>Falsche Placement:</strong> Lootably-Konfiguration kontrollieren.</li>
      <li><strong>Geo/Gerät nicht erlaubt:</strong> Nutzerstandort und Device prüfen.</li>
      <li><strong>SID fehlt:</strong> Nutzer muss eingeloggt sein; Wall neu öffnen.</li>
      <li><strong>Postback kommt nicht an:</strong> Lootably Callback-URL/Secret prüfen und Postback Logs ansehen.</li>
      <li><strong>Doppelte Transaction:</strong> Transaction ID / SID prüfen; bestehende Duplikat-Schutz-Logs kontrollieren.</li>
    </ul>
  </div>
);

const AdminTestingGuides = () => {
  const [tab, setTab] = useState('postback');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <FiBookOpen /> Testing Guides (Deutsch)
        </h1>
        <p className="admin-page-sub">Schritt-für-Schritt-Anleitungen für Postbacks und Lootably.</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('postback')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
            tab === 'postback'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FiActivity className="inline mr-1" /> Postback-Test
        </button>
        <button
          type="button"
          onClick={() => setTab('lootably')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
            tab === 'lootably'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FiExternalLink className="inline mr-1" /> Lootably-Test
        </button>
      </div>

      <div className="admin-card">
        {tab === 'postback' ? <PostbackGuide /> : <LootablyGuide />}
      </div>

      <div className="admin-card flex items-start gap-2 text-xs text-slate-500">
        <FiCheckCircle className="text-emerald-500 mt-0.5 shrink-0" />
        <p>Keine echten Secrets in Tickets oder Chats kopieren. Für jeden Test eine neue Transaction ID verwenden.</p>
      </div>
    </div>
  );
};

export default AdminTestingGuides;
