// Footer banner artwork has text baked into the image. Only languages that have
// dedicated artwork may use it; every other language (including future ones)
// gets a text-free banner so no other language's text is shown.
const LOCALIZED_BANNERS = {
  en: {
    light: { desktop: '/coins/image copy 17.png', mobile: '/coins/image copy 19.png' },
    dark: { desktop: '/coins/footerimageblackenglish.png', mobile: '/coins/wybt eng black.png' },
  },
  de: {
    light: { desktop: '/coins/image copy 17 german.png', mobile: '/coins/image copy 19 german.png' },
    dark: { desktop: '/coins/footerimageblackgerman.png', mobile: '/coins/wybt german black mobile.png' },
  },
  ur: {
    light: { desktop: '/coins/footer urdu light desktop.png', mobile: '/coins/footer urdu light mobil.png' },
    dark: { desktop: '/coins/footer urdu dark desktop.png', mobile: '/coins/footer urdu dark mobile.png' },
  },
};

export const TEXT_FREE_BANNERS = {
  light: { desktop: '/coins/footer-textfree-light-desktop.png', mobile: '/coins/footer-textfree-light-mobile.png' },
  dark: { desktop: '/coins/footer-textfree-dark-desktop.png', mobile: '/coins/footer-textfree-dark-mobile.png' },
};

export const getFooterBannerSrc = ({ language, isDarkMode, isMobile }) => {
  const base = String(language || 'en').toLowerCase().split(/[-_]/)[0];
  const theme = isDarkMode ? 'dark' : 'light';
  const size = isMobile ? 'mobile' : 'desktop';
  return (LOCALIZED_BANNERS[base] || TEXT_FREE_BANNERS)[theme][size];
};
