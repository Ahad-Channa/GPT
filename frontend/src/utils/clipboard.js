// Shared clipboard writer with a secure-context API path and a legacy
// textarea/execCommand fallback for non-secure (HTTP) environments.
//
// `nav`/`doc` are injectable for tests; in the browser they default to the
// globals. Rejects (rather than silently ignoring) when nothing is provided or
// when both copy mechanisms fail.
export const writeClipboardText = async (text, { nav, doc } = {}) => {
  if (text === undefined || text === null || String(text) === '') {
    throw new Error('Nothing to copy.');
  }

  const value = String(text);
  const n = nav ?? (typeof navigator !== 'undefined' ? navigator : null);
  const d = doc ?? (typeof document !== 'undefined' ? document : null);

  // Modern async Clipboard API (secure contexts only). On any failure fall
  // through to the legacy path instead of swallowing the error.
  if (n && n.clipboard && typeof n.clipboard.writeText === 'function') {
    try {
      await n.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the textarea/execCommand fallback.
    }
  }

  if (!d || typeof d.execCommand !== 'function') {
    throw new Error('Clipboard is not available in this environment.');
  }

  const textarea = d.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  d.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = d.execCommand('copy');
  } finally {
    d.body.removeChild(textarea);
  }

  if (!copied) throw new Error('Copy failed.');
  return true;
};

export default writeClipboardText;
