// Bundled by tests/goodpicks-history.test.js (vite SSR build) so the real History
// action component renders in Node with the real locale files.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import i18n from '../../src/i18n/i18n.js';

export { default as GoodpicksHistoryAction } from '../../src/components/offers/GoodpicksHistoryAction.jsx';
export { default as GoodpicksPlatformBadges } from '../../src/components/offers/GoodpicksPlatformBadges.jsx';
export * from '../../src/utils/offerLifecycle.js';
export { i18n, createElement, renderToString };
