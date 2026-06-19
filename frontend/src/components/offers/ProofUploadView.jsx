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

export const ProofUploadView = ({ offer, token, API, onSubmitted, setResult, onCancel }) => {
  const [proof, setProof] = useState('');
  const [proofImages, setProofImages] = useState([]);
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
      const res = await fetch(`${API}/custom-offers/${offer._id}/submit`, {
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
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '468px', flexShrink: 0 }}
    >
      {/* Upload Proof Header */}
      <div style={{ width: '468px', height: '39px', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 1 }}>
        <h3 style={{
          width: '468px', height: '19px', opacity: 1,
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontStyle: 'normal', fontSize: '16px',
          color: 'rgba(255, 255, 255, 1)', margin: 0, lineHeight: '1.2'
        }}>
          Upload Proof
        </h3>
        <p style={{
          width: '468px', height: '14px', opacity: 1,
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontStyle: 'normal', fontSize: '11px',
          color: 'rgba(136, 136, 136, 1)', margin: 0, lineHeight: '1.3'
        }}>
          Upload screenshots, receipts, or any files that prove task completion.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          width: '468px',
          height: '185px',
          borderRadius: '12px',
          paddingTop: '22px',
          paddingRight: '12px',
          paddingBottom: '22px',
          paddingLeft: '12px',
          gap: '16px',
          opacity: 1,
          border: `1px dashed rgba(73, 178, 101, 1)`,
          background: isDragging ? 'rgba(73, 178, 101, 0.25)' : 'rgba(73, 178, 101, 0.16)',
          backdropFilter: 'blur(44px)',
          WebkitBackdropFilter: 'blur(44px)',
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
        <img src="/coins/upload.png" alt="upload" style={{ 
          width: '34px', height: '34px', opacity: 1, 
          filter: 'brightness(0) saturate(100%) invert(56%) sepia(43%) saturate(555%) hue-rotate(83deg) brightness(96%) contrast(88%)' 
        }} />
        <div style={{ width: '444px', height: '37px', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 1, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '16px', color: '#fff', lineHeight: 1 }}>
            Drag & drop files here
          </span>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '12px', color: '#888', lineHeight: 1 }}>
            JPG, PNG. PDF up to 10MB each (max 10 files)
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          style={{
            width: '156px',
            height: '38px',
            borderRadius: '10px',
            padding: '10px 30px',
            gap: '10px',
            opacity: 1,
            background: 'rgba(39, 112, 58, 1)',
            boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)',
            color: '#fff',
            border: 'none',
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 600,
            fontSize: '14px',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {proofImages.map((img, idx) => (
            <div key={idx} style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '8px 12px', background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)', borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {img.base64.startsWith('data:image') ? (
                  <img src={img.base64} alt="preview" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}>PDF</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '12px', color: '#888' }}>{img.sizeStr}</span>
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0, lineHeight: '1.2' }}>
          Additional Details (Optional)
        </h3>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '11px', color: '#888', margin: 0, lineHeight: '1.3' }}>
          Provide any extra information that can help us verify your completion.
        </p>
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="Enter your User ID, email used for registration, transaction ID, username on the platform, or any other details..."
          rows={4}
          style={{
            width: '468px', height: '109px', background: 'rgba(0, 0, 0, 0.36)', border: '1px solid rgba(73, 178, 101, 1)', 
            borderRadius: '10px', padding: '16px', color: '#fff', fontSize: '14px', 
            resize: 'none', boxSizing: 'border-box', fontFamily: '"Barlow Condensed", sans-serif',
            backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)', opacity: 1, gap: '10px'
          }}
        />
      </div>

      <div style={{ display: 'flex', marginTop: '8px', paddingBottom: '4px' }}>
        <button
          type="submit"
          disabled={submitting || (proofImages.length === 0 && !proof.trim())}
          style={{
            width: '468px', height: '48px', borderRadius: '10px',
            padding: '10px 30px',
            background: 'rgba(73, 178, 101, 1)', color: 'rgba(255, 255, 255, 1)', border: 'none',
            fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: submitting || (proofImages.length === 0 && !proof.trim()) ? 'not-allowed' : 'pointer',
            opacity: submitting || (proofImages.length === 0 && !proof.trim()) ? 0.5 : 1,
            boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
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
    </motion.form>
  );
};
