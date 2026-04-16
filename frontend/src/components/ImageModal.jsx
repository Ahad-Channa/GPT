import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiZoomIn } from 'react-icons/fi';

const ImageModal = ({ isOpen, onClose, imageUrl }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-zoom-out"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center pointer-events-none rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="absolute top-4 right-4 z-10 pointer-events-auto">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-md border border-white/10"
            >
              <FiX size={20} />
            </button>
          </div>
          
          <div className="relative group w-auto h-auto pointer-events-auto flex justify-center items-center rounded-xl overflow-hidden bg-[#080b14]/50 border border-white/10">
            <img 
              src={imageUrl} 
              alt="Proof full view"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ImageModal;
