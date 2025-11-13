// OCR API helper functions

/**
 * Process an image file through the OCR service
 * @param {File} file - The image file to process
 * @returns {Promise<Object>} - Parsed data from the receipt
 */
// Safely read REACT_APP_API_URL without referencing `process` in browsers
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || '';

export const processOCRUpload = async (file, formType = 'cash') => {
    try {
        console.log('Starting OCR upload for file:', file?.name || file);

        // First upload the file to the server's upload endpoint so it's saved as a proof
        const uploadForm = new FormData();
        uploadForm.append('file', file);

        // Map formType to upload endpoint
        let uploadEndpoint = '/api/uploads';
        switch ((formType || '').toLowerCase()) {
            case 'cash':
                uploadEndpoint = '/api/uploads/cashPayments';
                break;
            case 'vendor':
                uploadEndpoint = '/api/uploads/vendorPayments';
                break;
            case 'local':
                uploadEndpoint = '/api/uploads/localTravel';
                break;
            case 'outstation':
                uploadEndpoint = '/api/uploads/outstationTravel';
                break;
            default:
                uploadEndpoint = '/api/uploads';
        }

        console.log('Uploading file to:', uploadEndpoint);
        let uploadRes;
        try {
            uploadRes = await fetch(uploadEndpoint, { method: 'POST', body: uploadForm });
        } catch (netErr) {
            throw new Error(
                `Upload failed: cannot reach server at ${API_BASE || window.location.origin}. Is backend running? (${netErr.message})`
            );
        }

        if (!uploadRes.ok) {
            // Try to parse JSON error, otherwise read plain text
            let errBody = null;
            try {
                errBody = await uploadRes.json();
            } catch (e) {
                try {
                    errBody = await uploadRes.text();
                } catch (_) {
                    errBody = null;
                }
            }
            throw new Error(
                errBody?.error || `Upload failed (${uploadRes.status}) - ${JSON.stringify(errBody)}`
            );
        }
        const uploadData = await uploadRes.json();
        const filePath = uploadData?.filePath || null; // server path like /uploadFiles/...
        console.log('File uploaded, server path:', filePath);

        // Now call OCR parse using the server filePath (so OCR route can read the saved file)
        // Use relative URL to work with both localhost and production deployments
        let ocrRes;
        try {
            ocrRes = await fetch(`${API_BASE}/api/ocr/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ filePath })
            });
        } catch (netErr) {
            throw new Error(
                `OCR service not reachable at ${API_BASE || window.location.origin}. Is backend running? (${netErr.message})`
            );
        }

        if (!ocrRes.ok) {
            let errBody = null;
            try {
                errBody = await ocrRes.json();
            } catch (e) {
                try { errBody = await ocrRes.text(); } catch (_) { errBody = null; }
            }
            // If 404 specifically, give actionable guidance
            if (ocrRes.status === 404) {
                throw new Error(
                    `OCR service not found (404). Is the backend server running on port 5000 and is the /api/ocr/parse route registered?`
                );
            }
            throw new Error(errBody?.error || `OCR parse failed (${ocrRes.status}) - ${JSON.stringify(errBody)}`);
        }

        const ocrJson = await ocrRes.json();
        if (!ocrJson.success) {
            throw new Error(ocrJson.error || 'OCR processing failed');
        }

        if (!ocrJson.data?.extracted) {
            throw new Error('No data extracted from image');
        }

        // include proofPath for frontend usage
        const extracted = ocrJson.data.extracted;
        extracted.proofPath = ocrJson.data.proofPath || filePath || null;
        return extracted;
    } catch (error) {
        console.error('OCR Upload Error:', error);
        throw error;
    }
};

/**
 * Maps OCR extracted data to form fields based on form type
 * @param {Object} ocrData - The data extracted by OCR
 * @param {string} formType - Type of form (e.g., 'cash', 'vendor', 'local', 'outstation')
 * @returns {Object} - Mapped form data
 */
export const mapOCRDataToForm = (ocrData, formType) => {
    // Base fields common to all forms
    // Use billNumber/billDate if available, otherwise fall back to invoiceNumber/date
    const baseFields = {
        vendorName: ocrData.vendorName || '',
        amount: ocrData.totalAmount || 0,
        date: ocrData.billDate || ocrData.date || '',
        billNumber: ocrData.billNumber || ocrData.invoiceNumber || '',
        totalAmount: ocrData.totalAmount || 0,
        proofPath: ocrData.proofPath || null
    };

    // Add form-specific fields
    switch (formType) {
        case 'cash':
            return {
                ...baseFields,
                description: ocrData.items ? ocrData.items.map(item => item.description).join(", ") : "",
                items: ocrData.items || []
            };
            
        case 'vendor':
            return {
                ...baseFields,
                gstNumber: ocrData.gstNumber || '',
                vendorAddress: ocrData.address || '',
                items: ocrData.items || []
            };
            
        case 'local':
            return {
                ...baseFields,
                fromLocation: '',  // These fields typically won't come from OCR
                toLocation: '',    // but kept for form completion
                distance: 0,
                travelMode: ''
            };
            
        case 'outstation':
            return {
                ...baseFields,
                gstNumber: ocrData.gstNumber || '',
                hotelAddress: ocrData.address || ''
            };
            
        default:
            return baseFields;
    }
};