import React, { useState } from 'react';

// Harmonious, modern color palette for default letter avatars
const AVATAR_COLORS = [
  'bg-[#5356FB]', // Primary Blue/Indigo
  'bg-[#F59E0B]', // Amber
  'bg-[#10B981]', // Emerald
  'bg-[#06B6D4]', // Cyan
  'bg-[#8B5CF6]', // Purple
  'bg-[#EC4899]', // Pink
  'bg-[#22C55E]', // Green
  'bg-[#3B82F6]', // Blue
  'bg-[#E11D48]', // Rose
  'bg-[#64748B]', // Slate
];

export const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const isGooglePhoto = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('googleusercontent.com') || url.includes('ggpht.com') || url.includes('google.com');
};

export default function UserAvatar({
  user,
  avatarUrl: explicitAvatarUrl,
  displayName: explicitDisplayName,
  size,
  className = '',
  imageClassName = '',
  textClassName = '',
  style = {},
}) {
  const [imgError, setImgError] = useState(false);

  // Extract avatar URL (ignore Google profile photos)
  const rawUrl =
    explicitAvatarUrl ||
    (typeof user === 'object'
      ? user?.avatarUrl || user?.avatar || user?.photoURL || user?.photo
      : null);
  const hasCustomAvatar =
    rawUrl &&
    typeof rawUrl === 'string' &&
    rawUrl.trim().length > 0 &&
    !isGooglePhoto(rawUrl) &&
    !rawUrl.includes('dicebear.com');

  // Extract display name / initial letter
  const name =
    explicitDisplayName ||
    (typeof user === 'string' ? user : null) ||
    user?.displayName ||
    user?.username ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'U';

  const initialLetter = (name.replace(/^@/, '').charAt(0) || 'U').toUpperCase();
  const avatarBg = getAvatarColor(name);

  const dimensionStyle = size
    ? {
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
      }
    : {};

  const combinedStyle = {
    ...dimensionStyle,
    ...style,
  };

  if (hasCustomAvatar && !imgError) {
    return (
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 ${className}`}
        style={combinedStyle}
      >
        <img
          src={rawUrl}
          alt={name}
          className={`w-full h-full object-cover select-none ${imageClassName}`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 select-none font-bold text-white ${avatarBg} ${className}`}
      style={{
        fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
        ...combinedStyle,
      }}
      title={name}
    >
      <span className={textClassName || 'text-base font-bold'}>{initialLetter}</span>
    </div>
  );
}
