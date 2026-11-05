import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiMail, FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function BannedAccountModal() {
  const { banModal, closeBanModal } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  if (!banModal?.isOpen) return null;

  const isMultiAccount = banModal.reason === 'auto_multi_account';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999999] overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 sm:p-6"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        onClick={closeBanModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`relative rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden w-full max-w-[540px] p-6 sm:p-8 transition-colors duration-300 ${
            isDarkMode ? 'border border-red-500/20 bg-[#0f1115] text-white' : 'bg-white text-gray-900 border border-red-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeBanModal}
            className={`absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 cursor-pointer ${
              isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5 text-red-500 shadow-lg shadow-red-500/10">
              <FiAlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 stroke-[2]" />
            </div>

            <h3
              className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-red-500"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {t('auth.bannedModalTitle', 'Account Suspended')}
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed max-w-[440px] mb-6 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {isMultiAccount
                ? t(
                    'auth.bannedModalMultiAccount',
                    'Your account has been automatically suspended for violating our Terms of Service due to confirmed multi-account abuse. Multiple accounts belonging to the same user are not permitted.'
                  )
                : (banModal.message || t(
                    'auth.bannedModalGeneral',
                    'Your account has been suspended for violating our Terms of Service.'
                  ))}
            </p>

            {/* Support Appeal Box */}
            <div
              className={`w-full rounded-2xl p-4 sm:p-5 text-left mb-6 border ${
                isDarkMode
                  ? 'bg-red-950/20 border-red-900/40 text-gray-300'
                  : 'bg-red-50/70 border-red-200 text-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <FiMail className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm leading-relaxed">
                  <span className="font-semibold text-red-500 block mb-1">
                    {t('auth.bannedModalAppealHeading', 'Think this is a mistake?')}
                  </span>
                  {t(
                    'auth.bannedModalAppeal',
                    'If you believe this ban was made in error, please contact our support team. Our administrators will review your case and restore your account if verified.'
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <a
                href="mailto:contact@taskmint.me?subject=Account%20Suspension%20Appeal"
                className="w-full sm:flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
              >
                <FiMail className="w-4 h-4" />
                {t('auth.contactSupport', 'Contact Support')}
              </a>
              <button
                type="button"
                onClick={closeBanModal}
                className={`w-full sm:w-auto py-3 px-6 rounded-xl font-semibold text-sm transition-colors cursor-pointer border ${
                  isDarkMode
                    ? 'border-white/10 hover:bg-white/5 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

