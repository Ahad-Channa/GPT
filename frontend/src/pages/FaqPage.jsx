import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FaqPage = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n?.language?.split('-')[0] || 'en';
  const isUrdu = lang === 'ur';

  // Default fallback FAQs from translation in case none have been added yet in admin
  const defaultFaqs = [
    { question: t('faqSection.q1'), answer: t('faqSection.a1') },
    { question: t('faqSection.q2'), answer: t('faqSection.a2') },
    { question: t('faqSection.q3'), answer: t('faqSection.a3') },
    { question: t('faqSection.q4'), answer: t('faqSection.a4') },
    { question: t('faqSection.q5'), answer: t('faqSection.a5') },
    { question: t('faqSection.q6'), answer: t('faqSection.a6') },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/public/faqs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.faqs) && data.faqs.length > 0) {
        setFaqs(data.faqs);
      } else {
        setFaqs(defaultFaqs);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setFaqs(defaultFaqs);
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedFaq = (faq) => {
    let q = faq.question || faq.q || '';
    let a = faq.answer || faq.a || '';

    if (lang === 'de') {
      q = faq.questionDe || q;
      a = faq.answerDe || a;
    } else if (lang === 'ur') {
      q = faq.questionUr || q;
      a = faq.answerUr || a;
    } else if (lang === 'fr') {
      q = faq.questionFr || q;
      a = faq.answerFr || a;
    } else if (lang === 'es') {
      q = faq.questionEs || q;
      a = faq.answerEs || a;
    } else if (lang === 'ru') {
      q = faq.questionRu || q;
      a = faq.answerRu || a;
    } else if (lang === 'pt') {
      q = faq.questionPt || q;
      a = faq.answerPt || a;
    } else if (lang === 'it') {
      q = faq.questionIt || q;
      a = faq.answerIt || a;
    } else if (lang === 'pl') {
      q = faq.questionPl || q;
      a = faq.answerPl || a;
    } else if (lang === 'tr') {
      q = faq.questionTr || q;
      a = faq.answerTr || a;
    }

    return { question: q, answer: a };
  };

  const displayFaqs = faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0E1015] text-white' : 'bg-[#FAFAFA] text-[#0E0F0C]'
      }`}
    >
      {/* Sticky Header */}
      <div
        className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
          isDarkMode ? 'bg-[#0E1015]' : 'bg-[#FAFAFA]'
        }`}
      >
        <Header />
      </div>

      {/* Main FAQ Section (Identical UI and structure to Landing page) */}
      <main className="flex-1 w-full flex flex-col items-center justify-start pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <section className="pt-4 pb-12 sm:pb-16 lg:pt-8 lg:pb-0 px-2 lg:px-6 bg-transparent w-full">
          <div className="flex flex-col lg:flex-row mx-auto w-full items-center lg:items-start max-w-[440px] lg:max-w-[1328px] gap-[56px] lg:gap-[114px]">
            {/* Left Side */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left w-full max-w-[424px] lg:max-w-[562px] lg:w-[45%] gap-4 lg:gap-[40px]">
              <h1
                className="m-0 text-center lg:text-left w-full max-w-[424px] lg:max-w-[562px] transition-colors duration-300"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
                }}
              >
                <span className="block text-[40px] sm:text-[48px] lg:text-[50px] leading-[44px] sm:leading-[48px] lg:leading-[54px]">
                  {t('faqSection.title')}
                  <br />
                  {t('faqSection.titleLine2')}
                </span>
              </h1>
              <p
                className="m-0 text-center lg:text-left w-full max-w-[314px] lg:max-w-[279px] transition-colors duration-300"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)',
                }}
              >
                <span className="block text-[18px] lg:text-[16px] leading-[28px]">
                  {t('faqSection.subtitle')}
                </span>
              </p>
            </div>

            {/* Right Side: Accordion dropdowns */}
            <div className="flex flex-col items-center lg:items-start w-full max-w-[424px] lg:max-w-[652px] lg:w-[55%] lg:-translate-y-[20px] gap-3">
              {displayFaqs.map((faq, i) => {
                const isOpen = openFaq === i;
                const localized = getLocalizedFaq(faq);

                return (
                  <div
                    key={faq._id || i}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    dir={isUrdu ? 'rtl' : 'ltr'}
                    className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden w-full max-w-[424px] lg:max-w-[652px]"
                    style={{
                      borderRadius: 20,
                      padding: '24px 20px',
                      gap: isOpen ? 16 : 0,
                      background: isDarkMode
                        ? isOpen
                          ? 'rgba(43, 51, 64, 0.4)'
                          : 'linear-gradient(0deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.06)), linear-gradient(0deg, rgba(43, 51, 64, 0.1), rgba(43, 51, 64, 0.1))'
                        : isOpen
                        ? 'rgba(246, 245, 237, 1)'
                        : 'transparent',
                      border: 'none',
                    }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span
                        className="m-0 font-medium text-[18px] sm:text-[20px] leading-[26px] transition-colors duration-300"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                        }}
                      >
                        {localized.question}
                      </span>
                      <div
                        className="transition-transform duration-300 flex items-center justify-center shrink-0 ml-2"
                        style={{
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                          filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
                        }}
                      >
                        <img
                          src="/coins/arup.png"
                          alt="Toggle FAQ"
                          style={{ width: 16, height: 10, objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                    {isOpen && (
                      <div className="transition-all duration-300 flex items-start overflow-hidden pt-2">
                        <p
                          className="m-0 transition-colors duration-300"
                          style={{
                            width: 394,
                            maxWidth: '100%',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '20px',
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 0.7)',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {localized.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FaqPage;
