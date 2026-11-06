import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiTrash2, FiLoader, FiX } from 'react-icons/fi';

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1200;
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const ProofUploadView = ({ offer, token, API, submitUrl, onSubmitted, setResult, onCancel }) => {
  const [proof, setProof] = useState('');
  const [proofImages, setProofImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (validFiles.length + proofImages.length > 10) {
      setResult({ type: 'error', message: 'You can upload a maximum of 10 files.' });
      return;
    }

    const newImages = [];
    for (const file of validFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setResult({ type: 'error', message: `File ${file.name} exceeds 10MB limit.` });
        continue;
      }
      try {
        let base64;
        if (file.type.startsWith('image/')) {
          base64 = await compressImage(file);
        } else {
          base64 = await new Promise((res) => {
             const r = new FileReader();
             r.onload = () => res(r.result);
             r.readAsDataURL(file);
          });
        }
        newImages.push({
          name: file.name,
          sizeStr: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          base64
        });
      } catch (err) {
        console.error('Error processing file', file.name, err);
      }
    }
    setProofImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const removeImage = (index) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = submitUrl || `${API}/custom-offers/${offer._id}/submit`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          proofText: proof, 
          proofImages: proofImages.map(img => img.base64) 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', message: 'Proof submitted! Awaiting admin review.' });
        if (onSubmitted) onSubmitted();
      } else {
        setResult({ type: 'error', message: data.error || 'Submission failed.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flexShrink: 0, color: '#0E0F0C' }}
    >
      {/* Upload Proof Header */}
      <div style={{ width: '100%', height: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', opacity: 1 }}>
        <h3 
          className="text-[14px] lg:text-[16px]"
          style={{
            width: '100%', height: 'auto', opacity: 1,
            fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontStyle: 'normal',
            color: '#0E0F0C', margin: 0, lineHeight: '1.2'
          }}
        >
          Upload Proof
        </h3>
        <p 
          className="text-[11px] lg:text-[11px]"
          style={{
            width: '100%', height: 'auto', opacity: 1,
            fontFamily: '"Poppins", sans-serif', fontWeight: 400, fontStyle: 'normal',
            color: '#64748B', margin: 0, lineHeight: '1.4'
          }}
        >
          Upload screenshots, receipts, or any files that prove task completion.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="w-full h-auto min-h-[140px] lg:min-h-[185px]"
        style={{
          borderRadius: '12px',
          paddingTop: '16px',
          paddingRight: '12px',
          paddingBottom: '16px',
          paddingLeft: '12px',
          gap: '10px',
          opacity: 1,
          border: `1px dashed ${isDragging ? '#24324D' : '#B8C2D1'}`,
          background: isDragging ? '#EEF2F7' : '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <img 
          src="/coins/upload.png" 
          alt="upload" 
          className="w-[30px] h-[30px] lg:w-[34px] lg:h-[34px] object-contain"
          style={{ 
            opacity: 1, 
            filter: 'brightness(0) saturate(100%) invert(56%) sepia(43%) saturate(555%) hue-rotate(83deg) brightness(96%) contrast(88%)' 
          }} 
        />
        <div style={{ width: '100%', height: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', opacity: 1, alignItems: 'center', justifyContent: 'center' }}>
          <span 
            className="text-[14px] lg:text-[16px]"
            style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#24324D', lineHeight: 1.3 }}
          >
            Drag & drop files here
          </span>
          <span 
            className="text-[11px] lg:text-[12px]"
            style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 400, color: '#64748B', lineHeight: 1.3 }}
          >
            JPG, PNG. PDF up to 10MB each (max 10 files)
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="w-[130px] h-[34px] lg:w-[156px] lg:h-[38px] text-[13px] lg:text-[14px]"
          style={{
            borderRadius: '10px',
            padding: '4px 20px',
            gap: '10px',
            opacity: 1,
            background: '#24324D',
            boxShadow: '0 3px 0 #18243A',
            color: '#fff',
            border: 'none',
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}
        >
          Browse Files
        </button>
        <input 
          type="file" 
          multiple 
          accept="image/jpeg,image/png,application/pdf" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {proofImages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {proofImages.map((img, idx) => (
            <div 
              key={idx} 
              className="p-2 lg:p-[8px_12px]"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: '1px solid #EAE4D7', borderRadius: '10px'
              }}
            >
              {img.base64.startsWith('data:image') ? (
                <button
                  type="button"
                  aria-label={`Preview uploaded proof ${img.name}`}
                  className="flex items-center gap-2.5 rounded-lg text-left bg-transparent border-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24324D]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewImage(img);
                  }}
                >
                  <img 
                    src={img.base64} 
                    alt={`Preview of ${img.name}`}
                    className="w-10 h-10 rounded-lg object-cover border border-[#EAE4D7]"
                  />
                  <span
                    className="text-[12px]"
                    style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#24324D', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {img.name}
                  </span>
                </button>
              ) : (
                <a
                  href={img.base64}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open uploaded proof ${img.name} in a new tab`}
                  className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24324D]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div 
                    className="w-10 h-10 rounded-lg bg-[#EEF2F7] flex items-center justify-center text-[10px] text-[#475569]"
                  >
                    PDF
                  </div>
                  <span 
                    className="text-[12px]"
                    style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#24324D', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {img.name}
                  </span>
                </a>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span 
                  className="text-[12px] lg:text-[12px]"
                  style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 400, color: '#64748B' }}
                >
                  {img.sizeStr}
                </span>
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)}
                  aria-label={`Remove ${img.name}`}
                  style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        <h3 
          className="text-[14px] lg:text-[16px]"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, color: '#0E0F0C', margin: 0, lineHeight: '1.2' }}
        >
          Additional Details (Optional)
        </h3>
        <p 
          className="text-[11px] lg:text-[11px]"
          style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 400, color: '#64748B', margin: 0, lineHeight: '1.4' }}
        >
          Provide any extra information that can help us verify your completion.
        </p>
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="Enter your User ID, email used for registration, transaction ID, username on the platform, or any other details..."
          rows={4}
          className="w-full h-[70px] lg:h-[109px] text-[15px] lg:text-[14px]"
          style={{
            background: '#FFFFFF', border: '1px solid #D8DEE8',
            borderRadius: '10px', padding: '12px', color: '#0E0F0C',
            resize: 'none', boxSizing: 'border-box', fontFamily: '"Poppins", sans-serif',
            opacity: 1, gap: '10px'
          }}
        />
      </div>

      <div style={{ display: 'flex', marginTop: '4px', paddingBottom: '4px', width: '100%' }}>
        <button
          type="submit"
          disabled={submitting || (proofImages.length === 0 && !proof.trim())}
          className="w-full h-[48px] lg:h-[48px] text-[18px] lg:text-[18px]"
          style={{
            borderRadius: '10px',
            padding: '10px 30px',
            background: '#24324D', color: '#FFFFFF', border: 'none',
            fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, lineHeight: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: submitting || (proofImages.length === 0 && !proof.trim()) ? 'not-allowed' : 'pointer',
            opacity: submitting || (proofImages.length === 0 && !proof.trim()) ? 0.5 : 1,
            boxShadow: '0 3px 0 #18243A'
          }}
        >
          {submitting ? (
            <FiLoader className="animate-spin" size={20} />
          ) : (
            <img src="/coins/retik.png" alt="tick" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          )}
          <span>{submitting ? 'Submitting...' : 'Submit Proof'}</span>
        </button>
      </div>

      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${previewImage.name}`}
          className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/80 p-4"
          onClick={(event) => {
            event.stopPropagation();
            setPreviewImage(null);
          }}
        >
          <div className="relative max-h-full max-w-full" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Close image preview"
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#24324D] shadow-lg"
              onClick={() => setPreviewImage(null)}
            >
              <FiX size={20} />
            </button>
            <img
              src={previewImage.base64}
              alt={previewImage.name}
              className="max-h-[85vh] max-w-[90vw] rounded-xl bg-white object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm text-white">{previewImage.name}</p>
          </div>
        </div>
      )}
    </motion.form>
  );
};
