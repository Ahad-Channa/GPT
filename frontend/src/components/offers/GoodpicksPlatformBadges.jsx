// One black badge per supported platform (PC, iOS, Android), shown in the
// Goodpicks History rows. An offer available on several platforms shows all of
// them; platforms that are not enabled are not shown.
const IOS_PATH = 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z';
const ANDROID_PATH = 'M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396';

const badgeStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: '#000000',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const Svg = ({ path }) => (
  <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
);

export default function GoodpicksPlatformBadges({ platforms }) {
  const p = platforms || {};
  const items = [
    p.desktop && { key: 'desktop', label: 'Desktop', icon: (
      <img src="/coins/desko.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
    ) },
    p.android && { key: 'android', label: 'Android', icon: <Svg path={ANDROID_PATH} /> },
    p.ios && { key: 'ios', label: 'iOS', icon: <Svg path={IOS_PATH} /> },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="shrink-0 flex items-center md:justify-center gap-1.5" data-testid="goodpicks-platform-badges">
      {items.map(({ key, label, icon }) => (
        <div key={key} style={badgeStyle} title={label} aria-label={label} data-platform={key}>
          {icon}
        </div>
      ))}
    </div>
  );
}
