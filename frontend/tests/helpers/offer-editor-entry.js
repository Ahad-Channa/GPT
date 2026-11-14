// Bundled by tests/offer-editor-smoke.test.js (vite SSR build) so the real editor
// component can be rendered in Node without a browser.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

export { OfferFormModal } from '../../src/pages/admin/AdminDirectOffers.jsx';
export { default as OfferEditorErrorBoundary } from '../../src/components/admin/OfferEditorErrorBoundary.jsx';
export { createEmptyGoal } from '../../src/utils/directOfferPayload.js';
export { createElement, renderToString };
