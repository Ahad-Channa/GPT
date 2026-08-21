/**
 * Lightweight browser fingerprinting utility.
 * Generates a hash from stable browser properties to detect multi-account usage.
 * No external dependencies needed — uses the Web Crypto API.
 */

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw text with various styles
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('TaskMint:fp', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('TaskMint:fp', 4, 17);

    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function getWebGLRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
  } catch {
    return '';
  }
}

/**
 * Generate a device fingerprint string.
 * Returns a SHA-256 hash of combined browser properties.
 */
export async function generateFingerprint() {
  try {
    const components = [
      // Screen properties
      `${screen.width}x${screen.height}`,
      `${screen.colorDepth}`,
      `${window.devicePixelRatio}`,
      // Timezone
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Language
      navigator.language,
      // Platform
      navigator.platform || '',
      // Hardware concurrency (CPU cores)
      `${navigator.hardwareConcurrency || ''}`,
      // Max touch points
      `${navigator.maxTouchPoints || 0}`,
      // Canvas fingerprint
      getCanvasFingerprint(),
      // WebGL renderer
      getWebGLRenderer(),
      // Installed plugins count (varies per browser)
      `${navigator.plugins?.length || 0}`,
    ];

    const raw = components.join('|||');
    return await sha256(raw);
  } catch (e) {
    console.warn('[Fingerprint] Generation failed:', e);
    return '';
  }
}
