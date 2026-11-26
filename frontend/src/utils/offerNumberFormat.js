// Coin amounts are always shown in the site's number style (4.200), the same as
// the cards, pills and Live Feed built by the designer (toLocaleString('de-DE')).
// The `locale` argument is kept so existing callers do not change.
const OFFER_NUMBER_LOCALE = 'de-DE';

export const resolveNumberLocale = () => OFFER_NUMBER_LOCALE;

export const formatOfferAmount = (amount) => {
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric : 0;
  return value.toLocaleString(OFFER_NUMBER_LOCALE);
};

export default formatOfferAmount;
