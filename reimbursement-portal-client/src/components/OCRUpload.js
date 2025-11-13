
import React, { useState } from 'react';
import { processOCRUpload, mapOCRDataToForm } from '../utils/ocrUtils';

const OCRUpload = ({ onOCRComplete, formType }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Basic validations
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (jpg, png, etc.)');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB allowed.');
      event.target.value = '';
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const ocrData = await processOCRUpload(file, formType);
      if (!ocrData) throw new Error('No data returned from OCR service');

      const mapped = mapOCRDataToForm(ocrData, formType);
      onOCRComplete(mapped);
    } catch (err) {
      console.error('OCR Upload Error:', err);
      if (err.message && err.message.includes('404')) {
        setError('OCR service not found (404). Is the backend server running on port 5000?');
      } else if (err.message && err.message.includes('Failed to fetch')) {
        setError('Cannot reach OCR service. Ensure the backend (http://localhost:5000) is running.');
      } else {
        setError(err.message || 'Failed to process the image. Try a different image or check the server logs.');
      }
    } finally {
      setIsProcessing(false);
      if (event && event.target) event.target.value = '';
    }
  };

  return (
    <div className="ocr-upload-container">
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
          style={{ display: 'none' }}
          id="ocr-upload"
        />
        <label htmlFor="ocr-upload" className={`upload-button ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? 'Processing...' : 'Scan Receipt'}
        </label>
        {error && <div className="error-message">{error}</div>}
      </div>

      <style>{`
        .ocr-upload-container { margin-bottom: 20px; }
        .upload-section { display:flex; flex-direction:column; align-items:center; gap:10px }
        .upload-button { padding:10px 20px; background:#007bff; color:#fff; border-radius:4px; cursor:pointer }
        .upload-button.processing { background:#6c757d; cursor:not-allowed }
        .error-message { color:#dc3545; font-size:0.9rem; margin-top:8px; text-align:center }
      `}</style>
    </div>
  );
};

export default OCRUpload;