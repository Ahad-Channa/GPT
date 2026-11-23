// Admin image upload helpers: the browser resizes the picked file and returns a
// compact data URL that is saved in the offer's existing `coverImage` field.

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_DIMENSION = 800;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const validateImageFile = (file) => {
  if (!file) return 'No file selected.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please choose a PNG, JPG, WebP or GIF image.';
  if (file.size > MAX_IMAGE_FILE_BYTES) return 'The image is larger than 5 MB.';
  return '';
};

export const fitWithin = (width, height, max = IMAGE_MAX_DIMENSION) => {
  const longest = Math.max(width, height);
  if (!longest || longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

export const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const problem = validateImageFile(file);
  if (problem) return reject(new Error(problem));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the image.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not read the image.'));
    img.onload = () => {
      const { width, height } = fitWithin(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      // WebP keeps transparency and stays small.
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
