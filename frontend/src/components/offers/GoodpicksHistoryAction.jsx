import { useTranslation } from 'react-i18next';
import { getOfferLifecycle } from '../../utils/offerLifecycle.js';

// Right-hand cell of a Goodpicks History row.
// Completed offers: plain text only (no button, link, handler or pointer cursor).
// Anything else: a details/resume button that opens the offer.
export default function GoodpicksHistoryAction({ offer, onOpen }) {
  const { t } = useTranslation();
  const lifecycle = getOfferLifecycle(offer);

  if (lifecycle === 'reversed') {
    return (
      <span
        data-testid="goodpicks-history-chargeback"
        style={{
          minWidth: '105px',
          textAlign: 'center',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 600,
          fontSize: '13px',
          color: '#DC2626',
          cursor: 'default',
        }}
      >
        {t('goodpicks.chargeback')}
      </span>
    );
  }

  if (lifecycle === 'completed') {
    return (
      <span
        data-testid="goodpicks-history-completed"
        style={{
          minWidth: '105px',
          textAlign: 'center',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 600,
          fontSize: '13px',
          color: '#15803D',
          cursor: 'default',
        }}
      >
        {t('goodpicks.completed')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(offer)}
      style={{
        width: '105px',
        height: '36px',
        borderRadius: '10px',
        background: '#00A3FF',
        color: '#FFFFFF',
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 600,
        fontSize: '13px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      className="hover:bg-[#0094EA] active:scale-[0.98] transition-all shadow-sm"
    >
      {t('goodpicks.seeDetails')}
    </button>
  );
}
