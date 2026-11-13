import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiExternalLink, FiCheckCircle, FiClock, FiLoader, FiXCircle, FiZap } from 'react-icons/fi';
import { FaApple, FaAndroid, FaDesktop } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import CoinDisplay from '../CoinDisplay';
import { GoodpicksSupportModal } from './GoodpicksModal';
import { ProofUploadView } from './ProofUploadView';
import { formatGoalTimeLimit } from '../../utils/goalTimeLimit';
import { isOfferClickLimitReached } from '../../utils/offerClickLimit';
import { formatGoalLabel } from '../../utils/offerGoalDisplay.js';
import { closeReservedOfferTab, hasManualOfferStarted, navigateReservedOfferTab, reserveOfferTab, resolveProofInstructions } from '../../utils/manualOfferState.js';
import { getOfferTranslation } from '../../utils/offerTranslations';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// Helper: is the value a URL/image path or an emoji?
const isIconUrl = (icon) =>
  icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

const isRequirementCompleted = (requirement) => {
  if (!requirement || typeof requirement !== 'object') return false;
  return requirement.completed === true || requirement.credited === true || requirement.status === 'approved';
};

const formatCoins = (amount) => Number(amount || 0).toLocaleString('de-DE');
const formatGoalRequirement = (goal, language, t) => {
  const label = formatGoalLabel(goal, language, t('offers.missingGoalLabel'));
  return t('offers.goalRewardInstruction', { label, coins: formatCoins(goal.rewardAmount) });
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

// Status badge config
const getStatusConfig = (t) => ({
  clicked: { label: t('offers.statusInProgress'), color: 'text-amber-400', bg: 'bg-amber-500/10  border-amber-500/20' },
  pending: { label: t('offers.statusPending'), color: 'text-amber-400', bg: 'bg-amber-500/10  border-amber-500/20' },
  approved: { label: t('offers.statusApproved'), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: t('offers.statusRejected'), color: 'text-rose-400', bg: 'bg-rose-500/10   border-rose-500/20' },
});

// ─── Small Card shown in the grid ────────────────────────────────────────────
export const DirectOfferCard = ({ offer, onClick }) => {
  const { i18n, t } = useTranslation();
  const offerText = getOfferTranslation(offer, i18n.resolvedLanguage || i18n.language);
  const title = offerText.title || t('offers.translationUnavailable', 'Translation unavailable');
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : null;
  const statusCfg = offer.clickStatus ? getStatusConfig(t)[offer.clickStatus] : null;
  const rewardVal = offer.rewardAmount ?? offer.points ?? offer.reward ?? 1250000;

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`cursor-pointer flex flex-col shrink-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 ${
        isExpired ? 'opacity-50' : ''
      }`}
      style={{
        width: '181.14px',
        height: '246.53px',
        borderRadius: '20px',
        paddingTop: '8px',
        paddingBottom: '15px',
        paddingLeft: '7.14px',
        paddingRight: '7.14px',
        gap: '15px',
        background: 'rgba(255, 255, 255, 1)',
        boxSizing: 'border-box',
      }}
    >
      {/* Cover area */}
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-[16px] bg-[#F3F4F6]"
        style={{
          width: '166.86px',
          height: '166.86px',
        }}
      >
        {coverImgSrc ? (
          <img
            src={coverImgSrc}
            alt={title}
            draggable="false"
            className="w-full h-full object-cover pointer-events-none select-none"
          />
        ) : offer.gradient ? (
          <div className={`w-full h-full bg-gradient-to-br ${offer.gradient} flex items-center justify-center`}>
            {offer.iconType === 'percent' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white font-black text-xl">%</span>
              </div>
            )}
            {offer.iconType === 'game' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white text-2xl">🎮</span>
              </div>
            )}
            {offer.iconType === 'survey' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white text-2xl">📋</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            {emojiIcon ? (
              <span className="text-3xl select-none">
                {emojiIcon}
              </span>
            ) : (
              <FiZap className="text-3xl text-indigo-500" />
            )}
          </div>
        )}

        {/* Top Center Platform Pill — only show selected platforms */}
        {(offer.platforms ? (offer.platforms.desktop || offer.platforms.android || offer.platforms.ios) : true) && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
            style={{
              width: '95.7px',
              height: '22.82px',
              paddingTop: '4px',
              paddingRight: '16px',
              paddingBottom: '4px',
              paddingLeft: '16px',
              gap: '8px',
              borderBottomRightRadius: '16px',
              borderBottomLeftRadius: '16px',
              background: 'rgba(255, 255, 255, 1)',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {(!offer.platforms || offer.platforms.desktop) && (
              <img
                src="/coins/desko.png"
                alt="Desktop"
                style={{ width: '12px', height: '12px', opacity: 1, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
            {(!offer.platforms || offer.platforms.android) && (
              <svg style={{ width: '12px', height: '12px', opacity: 1, flexShrink: 0 }} className="text-[#22C55E]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
            )}
            {(!offer.platforms || offer.platforms.ios) && (
              <svg style={{ width: '12px', height: '12px', opacity: 1, flexShrink: 0 }} className="text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Text info */}
      <div className="flex flex-col w-full text-left justify-between min-h-0">
        <p
          className="truncate text-[#0E0F0C]"
          title={title}
          style={{
            fontFamily: '"Bricolage Grotesque", sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            lineHeight: '18px',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </p>

        {/* Status OR reward */}
        {statusCfg ? (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 w-fit ${statusCfg.color} ${statusCfg.bg}`}
            style={{ fontFamily: '"Poppins", sans-serif' }}>
            {statusCfg.label}
          </span>
        ) : (
          <div
            className="flex items-center"
            style={{
              width: 'fit-content',
              height: '19.67px',
              borderRadius: '10px',
              paddingTop: '4px',
              paddingRight: '8px',
              paddingBottom: '4px',
              paddingLeft: '6px',
              gap: '4px',
              background: 'rgba(249, 247, 241, 1)',
              boxSizing: 'border-box',
            }}
          >
            <img
              src="/coins/procoinicon.png"
              alt="Coin"
              style={{
                width: '9px',
                height: '10px',
                opacity: 1,
                flexShrink: 0,
                objectFit: 'contain',
              }}
            />
            <span
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 700,
                fontSize: '12px',
                lineHeight: '1',
                letterSpacing: '0%',
                color: 'rgba(231, 171, 24, 1)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {rewardVal.toLocaleString('de-DE')}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Modal shown when user clicks a card ─────────────────────────────────────
export const DirectOfferModal = ({ offer, token, placement = 'featured', onClose, onClicked }) => {
  const { i18n, t } = useTranslation();
  const selectedLanguage = typeof window !== 'undefined' && window.__taskmintCurrentLang
    ? window.__taskmintCurrentLang
    : (i18n.resolvedLanguage || i18n.language || 'en');
  const offerText = getOfferTranslation(offer, selectedLanguage);
  const title = offerText.title || t('offers.translationUnavailable', 'Translation unavailable');
  const description = offerText.description;
  const requirements = offerText.requirements;
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [startedClickId, setStartedClickId] = useState(offer.clickId || '');
  const [proofStarted, setProofStarted] = useState(() => hasManualOfferStarted(offer));
  const [proofMessage, setProofMessage] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(offer.submissionStatus || null);
  const isManual = offer.trackingMode === 'manual';
  const proofInstructions = resolveProofInstructions(offer, selectedLanguage);
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const limitReached = isOfferClickLimitReached(offer);
  const rewardVal = offer.rewardAmount ?? offer.points ?? offer.reward ?? 0;
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '⚡';

  const enabledGoals = isManual ? [] : getEnabledGoals(offer);
  const hasGoalRows = enabledGoals.length > 0;
  const displayRequirementType = hasGoalRows ? 'bullets' : 'paragraph';
  const displayRequirements = hasGoalRows
    ? enabledGoals.map((goal) => ({
      label: formatGoalRequirement(goal, selectedLanguage, t),
      completed: isGoalCompleted(offer, goal),
      timeLimitDays: goal.timeLimitDays,
    }))
    : [requirementText(requirements, t('offers.defaultRequirement'))];

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
        if (res.ok && data.success && data.url) {
          const opened = navigateReservedOfferTab(pendingTab, data.url);
          setStartedClickId(data.clickId || '');
          setActionMessage(data.alreadyApproved
            ? t('offers.actionAlreadyCredited')
            : t('offers.actionClickRecorded'));
          if (!opened) {
            setActionError(t('offers.actionTabBlocked'));
          }
          if (isManual) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '626px',
          maxWidth: '96vw',
          height: '687px',
          maxHeight: '94vh',
          background: '#FFFFFF',
          borderRadius: '25px',
          padding: '14px',
          boxSizing: 'border-box',
          fontFamily: '"Poppins", sans-serif',
          color: '#0E0F0C',
          opacity: 1,
          transform: 'rotate(0deg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}
        className="relative shadow-2xl overflow-y-auto hide-scrollbar"
      >
        {/* Top Header Card */}
        <div
          style={{
            background: 'rgba(249, 247, 241, 1)',
            borderRadius: '18px',
            padding: '16px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          className="flex flex-col gap-3 shrink-0"
        >
          {/* Top Actions: Support Button & Close Button */}
          <div className="absolute top-[12px] right-[12px] z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSupportModal(true);
              }}
              style={{
                width: '24px',
                height: '24px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              className="hover:opacity-80 transition-opacity"
              title={t('offers.support')}
            >
              <img
                src="/coins/image copy 13.png"
                alt={t('offers.support')}
                className="w-[24px] h-[24px] object-contain"
              />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                background: '#000000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
              }}
              className="text-white hover:opacity-80 transition-opacity"
            >
              <FiX size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Top Section: Icon + Title + Description */}
          <div className="flex items-start gap-4 pr-8">
            <div className="w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] rounded-[16px] bg-[#EDE8DE] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
              {coverImgSrc ? (
                <img src={coverImgSrc} alt={title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{emojiIcon}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <h2
                className="text-[18px] sm:text-[21px] font-bold text-[#0E0F0C] leading-snug tracking-tight m-0"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                {title}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#4A4C46] mt-1 leading-relaxed m-0 font-normal">
                {description || t('offers.defaultDescription')}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-[#E8E3D8]" />

          {/* Platform & Reward Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-800">
              {offer.platforms?.ios && <FaApple className="text-lg text-gray-900" />}
              {offer.platforms?.android && <FaAndroid className="text-lg text-[#22C55E]" />}
              {(!offer.platforms || offer.platforms?.desktop) && <FaDesktop className="text-base text-gray-700" />}
            </div>

            {/* Reward Amount */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(254, 243, 199, 0.7)' }}
            >
              <img src="/coins/procoinicon.png" alt="Coin" className="w-3.5 h-3.5 object-contain" />
              <span
                className="font-bold text-[14px] sm:text-[15px]"
                style={{ color: 'rgba(231, 171, 24, 1)' }}
              >
                {rewardVal.toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="flex flex-col gap-2 shrink-0">
          <h3
            className="text-[15px] font-bold text-[#0E0F0C] m-0"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            {t('offers.requirements')}
          </h3>

          {/* Requirements Content */}
          <div className="flex flex-col gap-2">
            {displayRequirementType === 'paragraph' ? (
              <div
                style={{ background: 'rgba(249, 247, 241, 1)' }}
                className="flex items-center px-4 py-2.5 rounded-full border border-[#EAE4D7]/70"
              >
                <p className="text-[13px] font-medium text-[#1E293B] m-0 leading-relaxed">
                  {Array.isArray(displayRequirements) && displayRequirements.length > 0
                    ? displayRequirements.join(' ')
                    : typeof displayRequirements === 'string'
                    ? displayRequirements
                    : t('offers.defaultRequirement')}
                </p>
              </div>
            ) : displayRequirements && displayRequirements.length > 0 ? (
              displayRequirements.map((req, i) => (
                <div
                  key={i}
                  style={{ background: 'rgba(249, 247, 241, 1)' }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#EAE4D7]/70"
                >
                  {isRequirementCompleted(req) ? (
                    <div className="w-5 h-5 rounded-full bg-[#202C44] text-white flex items-center justify-center shrink-0">
                      <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#D1CCC2] bg-white shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-[#1E293B]">
                    {typeof req === 'object' ? (req.label || req.title || req.text || '') : req}
                  </span>
                  {typeof req === 'object' && formatGoalTimeLimit(req.timeLimitDays) && (
                    <span
                      className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: '#202C44', color: '#FFFFFF' }}
                    >
                      {formatGoalTimeLimit(req.timeLimitDays)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{ background: 'rgba(249, 247, 241, 1)' }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#EAE4D7]/70"
              >
                <div className="w-5 h-5 rounded-full border-2 border-[#D1CCC2] bg-white shrink-0" />
                <span className="text-[13px] font-medium text-[#1E293B]">
                  {t('offers.defaultRequirementTask')}
                </span>
              </div>
            )}
          </div>
        </div>

        {isManual && proofInstructions && (
          <div
            style={{ background: 'rgba(239, 246, 255, 0.9)', border: '1px solid rgba(59, 130, 246, 0.25)' }}
            className="rounded-[14px] p-3 shrink-0"
          >
            <h4
              className="text-[13px] font-bold text-[#0E0F0C] m-0 mb-1"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {t('offers.proofInstructions')}
            </h4>
            <p className="text-[12px] text-[#334155] m-0 whitespace-pre-wrap leading-relaxed">{proofInstructions}</p>
          </div>
        )}

        {isManual && submissionStatus === 'pending' && (
          <div className="text-center text-[12px] font-semibold text-[#0369A1] shrink-0">
            {t('offers.proofPending')}
          </div>
        )}
        {isManual && submissionStatus === 'approved' && (
          <div className="text-center text-[12px] font-semibold text-emerald-700 shrink-0">
            {t('offers.offerApproved')}
          </div>
        )}
        {isManual && submissionStatus === 'rejected' && offer.adminNote && (
          <div className="text-center text-[12px] font-semibold text-rose-700 shrink-0">
            {t('offers.statusRejected')}: {offer.adminNote}
          </div>
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
          <div className={`text-center text-[12px] font-semibold shrink-0 ${proofMessage.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
            {proofMessage.message}
          </div>
        )}

        {actionMessage && (
          <div role="status" className="text-center text-[12px] font-semibold text-emerald-700 shrink-0">
            {actionMessage}
            {startedClickId && <div className="mt-1 break-all font-mono font-normal">{t('offers.clickIdLabel')} {startedClickId}</div>}
          </div>
        )}

        {actionError && (
          <div className="text-center text-[12px] font-semibold text-[#B91C1C] shrink-0">{actionError}</div>
        )}

        {/* Start Offer Button */}
        <button
          onClick={handleGoToOffer}
          disabled={loading || isExpired || limitReached}
          style={{
            fontFamily: '"Bricolage Grotesque", sans-serif',
            background: '#24324D',
            color: '#FFFFFF',
            borderRadius: '12px',
          }}
          className="w-full h-[46px] font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer border-none shadow-md hover:bg-[#1A253A] transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <FiLoader className="animate-spin text-lg" />
          ) : isExpired ? (
            t('offers.offerExpired')
          ) : limitReached ? (
            t('offers.clickLimitReached')
          ) : (
            isManual && proofStarted ? t('offers.startOfferAgain') : t('offers.startOffer')
          )}
        </button>

        {/* General Offer Rules Box */}
        <div
          style={{ background: 'rgba(249, 247, 241, 1)' }}
          className="rounded-[18px] p-3.5 border border-[#EAE4D7] flex flex-col gap-1.5 shrink-0"
        >
          <h4
            className="text-[13px] font-bold text-[#0E0F0C] m-0"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            {t('offers.generalRules')}
          </h4>
          <ul className="text-[11px] sm:text-[12px] text-[#4A4C46] space-y-0.5 pl-4 list-disc font-normal leading-relaxed m-0">
            <li>{t('offers.rule1')}</li>
            <li>{t('offers.rule2')}</li>
            <li>{t('offers.rule3')}</li>
            <li>{t('offers.rule4')}</li>
            <li>{t('offers.rule5')}</li>
            <li>{t('offers.rule6')}</li>
          </ul>
        </div>

        {/* Support Popup Modal */}
        {showSupportModal && (
          <GoodpicksSupportModal
            onClose={() => setShowSupportModal(false)}
          />
        )}
      </motion.div>
    </motion.div>
  );
};
