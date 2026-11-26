import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FeaturedOfferCard, FeaturedOfferModal } from './OfferCards';
import { ProofUploadView } from './ProofUploadView';
import { formatGoalTimeLimit, formatGoalTimeLimitText } from '../../utils/goalTimeLimit';
import { isOfferClickLimitReached } from '../../utils/offerClickLimit';
import { formatGoalRewardInstruction } from '../../utils/offerGoalDisplay.js';
import { closeReservedOfferTab, hasManualOfferStarted, getProofInstructionsView, navigateReservedOfferTab, rememberManualOfferStarted, reserveOfferTab } from '../../utils/manualOfferState.js';
import { getOfferDisplayLocale, getOfferDisplayText } from '../../utils/offerTranslations';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Tracked (postback) offers use the designer's FeaturedOfferCard / FeaturedOfferModal
// from OfferCards.jsx, so they look exactly like every other offer on the site.
// This file only maps tracked-offer data (translations, goals, lifecycle) onto them
// and keeps the click / proof logic. Do not copy their markup here.

// Per-language fields of a legacy offer would override the text we resolve below.
const LOCALIZED_FIELD = /^(title|description|requirements)(Ur|De|Fr|Es|Ru|Pt|It|Pl|Tr)$/;

const withDisplayText = (offer, patch) => {
  const base = {};
  for (const [key, value] of Object.entries(offer || {})) {
    if (!LOCALIZED_FIELD.test(key)) base[key] = value;
  }
  return { ...base, ...patch };
};

const getEnabledGoals = (offer) =>
  Array.isArray(offer?.goals) ? offer.goals.filter((goal) => goal && goal.enabled !== false) : [];

const isGoalCompleted = (offer, goal) => {
  const key = goal?.goalKey;
  if (!key) return false;
  if (Array.isArray(offer?.completedGoalKeys)) return offer.completedGoalKeys.includes(key);
  if (Array.isArray(offer?.completedGoals)) {
    return offer.completedGoals.some((completed) => completed === key || completed?.goalKey === key || completed?.key === key);
  }
  const goalState = offer?.goalStatuses?.[key] || offer?.goalCompletions?.[key];
  return goalState === true || goalState?.completed === true || goalState?.credited === true || goalState?.status === 'approved';
};

const requirementText = (requirements, fallback) => {
  if (Array.isArray(requirements) && requirements.length > 0) return requirements.join(' ');
  if (typeof requirements === 'string' && requirements.trim()) return requirements;
  return fallback;
};

// ─── Small Card shown in the grid ────────────────────────────────────────────
export const DirectOfferCard = ({ offer, onClick }) => {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const offerText = getOfferDisplayText(offer, language);
  const title = offerText.title || t('offers.translationUnavailable', 'Translation unavailable');
  return <FeaturedOfferCard offer={withDisplayText(offer, { title })} onClick={onClick} />;
};

// ─── Modal shown when user clicks a card ─────────────────────────────────────
export const DirectOfferModal = ({ offer, token, placement = 'featured', onClose, onClicked }) => {
  const { i18n, t } = useTranslation();
  const { isDarkMode } = useTheme();
  // The live i18n language is the single source of truth. (A stale window global
  // used to override it and showed German proof instructions in English.)
  const selectedLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const offerText = getOfferDisplayText(offer, selectedLanguage);
  // Language of the offer text actually shown (English when the offer has no text in the selected one).
  const displayLocale = getOfferDisplayLocale(offer, selectedLanguage);
  const title = offerText.title || t('offers.translationUnavailable', 'Translation unavailable');
  const description = offerText.description || t('offers.translationUnavailable', 'Translation unavailable');

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [proofStarted, setProofStarted] = useState(() => hasManualOfferStarted(offer));
  const [proofMessage, setProofMessage] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(offer.submissionStatus || null);
  const isManual = offer.trackingMode === 'manual';
  const proofView = getProofInstructionsView(offer, selectedLanguage);
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const limitReached = isOfferClickLimitReached(offer);

  const enabledGoals = isManual ? [] : getEnabledGoals(offer);
  const hasGoalRows = enabledGoals.length > 0;
  const requirementRows = hasGoalRows
    ? enabledGoals.map((goal) => ({
      label: formatGoalRewardInstruction(goal, selectedLanguage, t),
      completed: isGoalCompleted(offer, goal),
      timeLimitText: formatGoalTimeLimit(goal.timeLimitDays) ? formatGoalTimeLimitText(goal.timeLimitDays, displayLocale) : '',
    }))
    : [requirementText(offerText.requirements, t('offers.defaultRequirement'))];

  // Once a manual offer is started the proof area stays visible and the button
  // reads "Start Offer Again".
  const manualBusy = isManual && ['pending', 'approved'].includes(submissionStatus);

  const handleGoToOffer = async () => {
    if (isExpired || limitReached) return;
    // Open the destination tab synchronously during the user gesture. Opening
    // it after the awaited API request is commonly blocked by browser popup
    // protection, which leaves a successfully logged click with no destination.
    const pendingTab = token ? reserveOfferTab() : null;
    setLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      if (token) {
        const res = await fetch(`${API}/direct-offers/click/${offer._id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ placement }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.alreadyCompleted) {
          // Fully credited: nothing left to earn, so do not reopen the tracking link.
          closeReservedOfferTab(pendingTab);
          if (data.submissionStatus) setSubmissionStatus(data.submissionStatus);
          setActionMessage(t('offers.actionAlreadyCompleted'));
          if (onClicked) onClicked(offer._id, { submissionStatus: data.submissionStatus || submissionStatus });
        } else if (res.ok && data.success && data.url) {
          const opened = navigateReservedOfferTab(pendingTab, data.url);
          // No "click recorded" banner: the popup stays clean after Start. (Resuming
          // the original click is valid for unfinished multi-step offers.)
          if (!opened) {
            setActionError(t('offers.actionTabBlocked'));
          }
          if (isManual) {
            rememberManualOfferStarted(offer._id);
            setProofStarted(true);
            if (data.submissionStatus) setSubmissionStatus(data.submissionStatus);
          }
          if (onClicked) onClicked(offer._id, { submissionStatus: data.submissionStatus || 'started' });
        } else if (data.limitReached) {
          closeReservedOfferTab(pendingTab);
          setActionError(t('offers.clickLimitReached'));
        } else {
          closeReservedOfferTab(pendingTab);
          setActionError(data.error || t('offers.actionCouldNotStart'));
        }
      } else {
        closeReservedOfferTab(pendingTab);
        setActionError(t('offers.actionSignInAgain'));
      }
    } catch (err) {
      closeReservedOfferTab(pendingTab);
      console.error('Failed to process click:', err);
      setActionError(t('offers.actionCouldNotStart'));
    } finally {
      setLoading(false);
    }
  };

  const startLabel = isExpired
    ? t('offers.offerExpired')
    : limitReached
      ? t('offers.clickLimitReached')
      : (isManual && proofStarted ? t('offers.startOfferAgain') : t('offers.startOffer'));

  // Messages / proof upload shown between the requirements and the Start button.
  const noticeColor = isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#334155';
  const centered = { textAlign: 'center', fontSize: '12px', fontWeight: 600, margin: 0 };
  const notice = (
    <>
      {isManual && (proofView.text || proofView.unavailable) && (
        <div
          style={{
            background: isDarkMode ? 'rgba(23, 26, 29, 1)' : 'rgba(239, 246, 255, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '12px',
          }}
          className="shrink-0"
        >
          <h4 style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>
            {t('offers.proofInstructions')}
          </h4>
          <p style={{ fontSize: '12px', color: noticeColor, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {proofView.text || t('offers.translationUnavailable', 'Translation unavailable')}
          </p>
        </div>
      )}

      {isManual && submissionStatus === 'pending' && (
        <div style={{ ...centered, color: '#0369A1' }} className="shrink-0">{t('offers.proofPending')}</div>
      )}
      {isManual && submissionStatus === 'approved' && (
        <div style={{ ...centered, color: '#047857' }} className="shrink-0">{t('offers.offerApproved')}</div>
      )}
      {isManual && submissionStatus === 'rejected' && offer.adminNote && (
        <div style={{ ...centered, color: '#BE123C' }} className="shrink-0">{t('offers.statusRejected')}: {offer.adminNote}</div>
      )}

      {isManual && proofStarted && submissionStatus !== 'pending' && submissionStatus !== 'approved' && (
        <div className="rounded-[16px] border border-[#EAE4D7] bg-[#F9F7F1] p-3 sm:p-4 shrink-0">
          <ProofUploadView
            offer={offer}
            token={token}
            API={API}
            submitUrl={`${API}/direct-offers/${offer._id}/submit`}
            setResult={setProofMessage}
            onSubmitted={() => setSubmissionStatus('pending')}
          />
        </div>
      )}

      {proofMessage?.message && (
        <div style={{ ...centered, color: proofMessage.type === 'error' ? '#B91C1C' : '#047857' }} className="shrink-0">
          {proofMessage.message}
        </div>
      )}
      {actionMessage && (
        <div role="status" style={{ ...centered, color: '#047857' }} className="shrink-0">{actionMessage}</div>
      )}
      {actionError && (
        <div style={{ ...centered, color: '#B91C1C' }} className="shrink-0">{actionError}</div>
      )}
    </>
  );

  return (
    <FeaturedOfferModal
      offer={withDisplayText(offer, {
        title,
        description,
        requirements: requirementRows,
        requirementType: hasGoalRows ? 'bullets' : 'paragraph',
      })}
      token={token}
      onClose={onClose}
      onStart={handleGoToOffer}
      startLoading={loading}
      startLabel={startLabel}
      startDisabled={limitReached || manualBusy}
      notice={notice}
    />
  );
};
