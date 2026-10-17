import React, { createContext, useContext, useState, useCallback } from 'react';
import LegalModal from '../components/LegalModal';

const LegalModalContext = createContext({
  openLegal: () => {},
  closeLegal: () => {},
});

export const useLegalModal = () => useContext(LegalModalContext);

export const LegalModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [slug, setSlug] = useState('impressum');

  const openLegal = useCallback((targetSlug = 'impressum') => {
    setSlug(targetSlug);
    setIsOpen(true);
  }, []);

  const closeLegal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LegalModalContext.Provider value={{ openLegal, closeLegal }}>
      {children}
      <LegalModal
        isOpen={isOpen}
        onClose={closeLegal}
        initialSlug={slug}
      />
    </LegalModalContext.Provider>
  );
};
