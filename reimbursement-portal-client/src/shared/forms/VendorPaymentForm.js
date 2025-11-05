import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// --- pdf worker config (uses CDN) ---
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

// ----------------------
// Utilities: number -> words (Indian)
// ----------------------
const numberToWords = (num) => {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100)
    return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
  if (num < 1000)
    return (
      a[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " " + numberToWords(num % 100) : "")
    );
  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      " Thousand " +
      (num % 1000 ? numberToWords(num % 1000) : "")
    );
  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      " Lakh " +
      (num % 100000 ? numberToWords(num % 100000) : "")
    );
  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore " +
    (num % 10000000 ? numberToWords(num % 10000000) : "")
  );
};

const amountToWords = (amount) => {
  const num = Number(amount) || 0;
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  const rupeesWords = rupees ? numberToWords(rupees) + " Rupees" : "";
  const paiseWords = paise ? numberToWords(paise) + " Paise" : "";
  if (rupees && paise) return `${rupeesWords} and ${paiseWords}`;
  if (rupees && !paise) return `${rupeesWords} Only`;
  if (!rupees && paise) return `${paiseWords} Only`;
  return "Zero";
};

const parseAmountValue = (s) => {
  if (!s && s !== 0) return 0;
  const cleaned = String(s).replace(/[^0-9.-]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// ----------------------
// Text parsing helpers
// Aim: extract vendorName, billNo, billDate, amount (grand total) reliably
// ----------------------
const parseInvoiceFromText = (rawText) => {
  const text = String(rawText || "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const joined = lines.join(" \n ");

  let result = {
    billNo: "",
    vendorName: "",
    organizationName: "",
    hotelName: "",
    billDate: "",
    amount: "",
    totalAmount: "",
    grandTotal: "",
    rawText: text,
  };

  // 1) Invoice/Bill Number common patterns
  const billNoRegexes = [
    /(?:invoice|bill|receipt)[^\n]{0,20}?(?:no\.?|#|num|number)\s*[:#-]?\s*([A-Za-z0-9\-_/]+)/i,
    /(?:bill|receipt|invoice)\s*[:\-]?\s*([A-Za-z0-9\-_/]{5,})/i,
    /ref\.*\s*[:\-]?\s*([A-Za-z0-9\-_/]+)/i,
  ];
  for (const rx of billNoRegexes) {
    const m = joined.match(rx);
    if (m) {
      result.billNo = m[1].trim();
      break;
    }
  }

  // 2) Vendor / From / Supplier
  const vendorRegexes = [
    /(?:vendor|supplier|bill from|from|issued by|billed to)\s*[:\-]?\s*([A-Za-z0-9\s&.,'"\-()\/]+?)(?:\n|$)/i,
    /^([A-Z][A-Z0-9\s&.,'"\-()]{3,})$/m, // all-caps line (company header)
  ];
  for (const rx of vendorRegexes) {
    const m = joined.match(rx);
    if (m) {
      result.vendorName = m[1].trim();
      result.organizationName = result.vendorName;
      break;
    }
  }
  // fallback: first line with more letters
  if (!result.vendorName) {
    const firstLine = lines.find((l) => l.length > 3 && /[A-Za-z]/.test(l));
    if (firstLine) result.vendorName = firstLine;
  }

  // 3) Hotel Name hints
  const hotelLine = lines.find((l) =>
    /hotel|restaurant|resort|cafe|inn/i.test(l)
  );
  if (hotelLine) result.hotelName = hotelLine;

  // 4) Date patterns (dd/mm/yyyy or dd-mmm-yyyy or mmm dd, yyyy)
  const dateRegexes = [
    /\b(\d{1,2}[\/\-]\w{3,}[\/\-]\d{2,4})\b/i,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    /\b([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\b/,
    /(date|dated)\s*[:\-]?\s*(\d{1,2}[\/\-\w, ]{3,}\d{2,4})/i,
  ];
  for (const rx of dateRegexes) {
    const m = joined.match(rx);
    if (m) {
      result.billDate = (m[2] || m[1] || "").trim();
      break;
    }
  }

  // 5) Amounts: prefer labeled Grand Total / Final Total / Net Amount
  const grandTotalRx = /(?:grand\s*total|final\s*(?:amount|total)|amount\s*(?:payable|due)|net\s*(?:amount|total)|invoice\s*total|total\s*payable|balance\s*due|total\s*inclusive\s*(?:of\s*gst)?)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+\.?[0-9]*)/ig;
  const totalRx = /(?:total\s*amount|total|sub\s*total|taxable\s*amount)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+\.?[0-9]*)/ig;

  const gMs = [...joined.matchAll(grandTotalRx)];
  if (gMs.length > 0) {
    const lastGM = gMs[gMs.length - 1];
    result.grandTotal = lastGM[1].replace(/,/g, "");
    result.amount = result.grandTotal;
  } else {
    const tMs = [...joined.matchAll(totalRx)];
    if (tMs.length > 0) {
      const lastTM = tMs[tMs.length - 1];
      result.totalAmount = lastTM[1].replace(/,/g, "");
      result.amount = result.totalAmount;
      result.grandTotal = result.totalAmount;
    } else {
      const allNums = joined.match(/[0-9,]+\.?[0-9]*/g) || [];
      const values = allNums
        .map((n) => parseFloat(n.replace(/,/g, "")))
        .filter((v) => !isNaN(v) && v > 0);
      if (values.length) {
        const max = Math.max(...values);
        result.amount = String(max);
        result.grandTotal = String(max);
      }
    }
  }

  if (result.vendorName && result.vendorName.length > 150) {
    result.vendorName = result.vendorName.slice(0, 150);
  }

  return result;
};

// ----------------------
// OCR functions
// ----------------------
const imageFileToCanvas = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_DIM = 2000;
      let { width, height } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = (e) => reject(e);

    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target.result;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

const pdfFileToCanvas = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const renderContext = {
    canvasContext: context,
    viewport,
  };
  await page.render(renderContext).promise;
  return canvas;
};

const recognizeCanvasText = async (canvas, onProgress) => {
  const { data } = await Tesseract.recognize(canvas, "eng", {
    logger: (m) => {
      if (onProgress) onProgress(m);
    },
  });
  return data.text || "";
};

const extractTextFromFile = async (file, onProgress) => {
  try {
    let canvas;
    if (file.type === "application/pdf" || file.name.match(/\.pdf$/i)) {
      canvas = await pdfFileToCanvas(file);
    } else {
      canvas = await imageFileToCanvas(file);
    }

    const text = await recognizeCanvasText(canvas, onProgress);
    const parsed = parseInvoiceFromText(text);
    parsed._ocrRaw = text;
    return parsed;
  } catch (err) {
    console.error("OCR error", err);
    throw err;
  }
};

// ----------------------
// Modal component
// ----------------------
const Modal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={{ marginTop: 0 }}>📋 OCR Extracted Data — Verify</h3>

        <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 12 }}>
          <div style={modalStyles.dataRow}>
            <strong>Vendor/Organization Name:</strong>
            <span>{data.vendorName || data.organizationName || "N/A"}</span>
          </div>
          {data.hotelName && (
            <div style={modalStyles.dataRow}>
              <strong>Hotel/Restaurant Name:</strong>
              <span>{data.hotelName}</span>
            </div>
          )}
          <div style={modalStyles.dataRow}>
            <strong>Invoice/Bill No:</strong>
            <span>{data.billNo || "N/A"}</span>
          </div>
          <div style={modalStyles.dataRow}>
            <strong>Bill Date:</strong>
            <span>{data.billDate || "N/A"}</span>
          </div>
          <div style={modalStyles.dataRow}>
            <strong>Grand Total:</strong>
            <span style={{ color: "#2e7d32", fontWeight: 600 }}>
              ₹{data.grandTotal || data.amount || "0.00"}
            </span>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#444", background: "#fafafa", padding: 8, borderRadius: 4 }}>
            <strong>Raw OCR (short):</strong>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 160, overflow: "auto" }}>
              {String(data._ocrRaw || "").slice(0, 1500)}
              {String(data._ocrRaw || "").length > 1500 ? "..." : ""}
            </pre>
          </div>
        </div>

        <div style={{ backgroundColor: "#fff3cd", padding: 10, borderRadius: 4, border: "1px solid #ffc107", marginBottom: 12 }}>
          ⚠️ <strong>Note:</strong> Verify before confirming. You can edit fields after confirmation.
        </div>

        <div style={{ textAlign: "right", marginTop: 8 }}>
          <button onClick={onClose} style={{ ...modalStyles.button, backgroundColor: "#6c757d", marginRight: 8 }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...modalStyles.button, backgroundColor: "#28a745" }}>✓ Confirm & Use Data</button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: 560,
    background: "#fff",
    padding: 18,
    borderRadius: 8,
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
    maxHeight: "90vh",
    overflow: "auto",
  },
  button: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    background: "#f8f9fa",
    padding: "8px 10px",
    borderRadius: 4,
    marginBottom: 8,
    borderLeft: "3px solid #007bff",
  },
};

// ----------------------
// Main Component
// ----------------------
const VendorPaymentForm = () => {
  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const generateVoucherNo = () => "VP-" + Math.floor(1000 + Math.random() * 9000);

  const initialData = {
    vendorName: "",
    projectName: "",
    date: todayDate,
    voucherNo: generateVoucherNo(),
    ecLocation: "Pune",
    paymentMode: "Cheque/Online",
    paymentDate: "",
    bills: Array(10)
      .fill(null)
      .map(() => ({ billNo: "", billDate: "", description: "", amount: "" })),
    totalExpenses: 0,
    amtInWords: "",
    preparedBy: "",
    receiverSign: "",
    accountsSign: "",
    authorizedSignatory: "",
  };

  const [formData, setFormData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [currentBillIndex, setCurrentBillIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(null);

  // Compute totals when bills change
  useEffect(() => {
    const totalNumeric = formData.bills.reduce((sum, b) => {
      return sum + parseAmountValue(b.amount);
    }, 0);
    setFormData((prev) => ({
      ...prev,
      totalExpenses: Number(totalNumeric.toFixed(2)),
      amtInWords: amountToWords(Number(totalNumeric.toFixed(2))),
    }));
  }, [formData.bills]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillChange = (index, field, value) => {
    setFormData((prev) => {
      const newBills = [...prev.bills];
      newBills[index] = { ...newBills[index], [field]: value };
      return { ...prev, bills: newBills };
    });
  };

  // OCR Upload handler
  const handleOCRUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setIsProcessing(true);
    setOcrProgress(null);

    try {
      const parsed = await extractTextFromFile(file, (m) => {
        setOcrProgress(m);
      });

      setOcrData(parsed);
      const emptyIndex = formData.bills.findIndex((b) => !b.billNo && !b.amount);
      setCurrentBillIndex(emptyIndex !== -1 ? emptyIndex : formData.bills.length - 1);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("OCR failed. See console for details.");
      setPendingFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm OCR and autofill
  const confirmOCRData = () => {
    if (!ocrData) {
      setModalOpen(false);
      return;
    }

    // Update form data in a single state update to avoid multiple renders
    setFormData((prev) => {
      const newBills = [...prev.bills];
      newBills[currentBillIndex] = {
        ...newBills[currentBillIndex],
        billNo: ocrData.billNo || "",
        billDate: ocrData.billDate || "",
        amount: ocrData.grandTotal || ocrData.amount || "",
        description: ocrData.hotelName
          ? ocrData.hotelName === (ocrData.vendorName || ocrData.organizationName || "")
            ? `Payment for bill ${ocrData.billNo || ""}`
            : `Payment to ${ocrData.hotelName}`
          : `Payment for bill ${ocrData.billNo || ""}`,
      };

      // Always update vendorName with OCR data
      const vendorToUse = ocrData.vendorName || ocrData.organizationName || ocrData.hotelName || prev.vendorName;

      return {
        ...prev,
        vendorName: vendorToUse,
        bills: newBills,
      };
    });

    // Save proof file
    if (pendingFile) {
      setProofFiles((prev) => [
        ...prev,
        {
          file: pendingFile,
          name: pendingFile.name,
          url: URL.createObjectURL(pendingFile),
          billIndex: currentBillIndex,
          extractedData: ocrData,
        },
      ]);
    }

    // Cleanup
    setModalOpen(false);
    setOcrData(null);
    setPendingFile(null);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = () => {
    if (!formData.vendorName) {
      alert("Please enter Vendor Name!");
      return;
    }
    const hasAnyBill = formData.bills.some((b) => b.billNo || b.amount);
    if (!hasAnyBill) {
      alert("Please add at least one bill entry!");
      return;
    }

    const submissionData = {
      ...formData,
      proofs: proofFiles.map((p) => ({ fileName: p.name, billIndex: p.billIndex })),
    };

    console.log("Form Data with Proofs:", submissionData);
    alert("Vendor Payment Voucher submitted successfully!");

    setFormData(initialData);
    setProofFiles([]);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", backgroundColor: "#fff", padding: "30px", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}>
        {/* OCR Upload Section */}
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "5px", border: "1px solid #2196f3" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>📤 Upload Bill for OCR Processing</h4>
          <p style={{ fontSize: "12px", color: "#666", margin: "5px 0 10px 0" }}>
            Upload a bill/invoice image or PDF. The system will attempt to extract:
            <br />
            <strong>Vendor/Organization Name, Hotel Name, Invoice Number, Bill Date, Grand Total/Amount</strong>
          </p>

          <input type="file" accept="image/*,.pdf" onChange={handleOCRUpload} style={{ padding: 8, fontSize: 14 }} disabled={isProcessing} />
          {isProcessing && (
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#2196F3", fontSize: 14 }}>⏳ Processing OCR... </span>
              {ocrProgress && ocrProgress.status && (
                <span style={{ color: "#666", marginLeft: 10 }}>
                  {ocrProgress.status} {ocrProgress.progress ? `(${Math.round(ocrProgress.progress*100)}%)` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={confirmOCRData} data={ocrData || {}} />

        {/* Main Form Table */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th colSpan="6" style={styles.headerMain}>SAMARTH UDYOG TECHNOLOGY FORUM</th>
            </tr>
            <tr>
              <td colSpan="6" style={styles.headerSub}>
                CIN: U74999PN2017NPL172629<br />
                Registered Office: Ground Floor, SPPU Research Park Foundation,<br />
                Savitribai Phule Pune University, Ganeshkhind, Pune - 411 007
              </td>
            </tr>
            <tr>
              <th colSpan="6" style={styles.headerTitle}>Vendor Payment Vouchers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.labelCell}>Vendor Name :</td>
              <td colSpan="3" style={styles.inputCell}>
                <input type="text" value={formData.vendorName} onChange={(e) => handleInputChange("vendorName", e.target.value)} style={styles.input} placeholder="Enter vendor name" />
              </td>
              <td style={styles.labelCell}>Date :</td>
              <td style={styles.inputCell}>
                <input type="text" value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} style={styles.input} />
              </td>
            </tr>

            <tr>
              <td style={styles.labelCell}>Project Name :</td>
              <td colSpan="5" style={styles.inputCell}>
                <input type="text" value={formData.projectName} onChange={(e) => handleInputChange("projectName", e.target.value)} style={styles.input} placeholder="Enter project name" />
              </td>
            </tr>

            <tr>
              <td style={styles.labelCell}>EC Location :</td>
              <td colSpan="5" style={styles.inputCell}>
                <input type="text" value={formData.ecLocation} onChange={(e) => handleInputChange("ecLocation", e.target.value)} style={styles.input} />
              </td>
            </tr>

            <tr>
              <th style={styles.thCellSrNo}>Sr No.</th>
              <th style={styles.thCellBillNo}>Bill No</th>
              <th style={styles.thCellBillDate}>Bill Date</th>
              <th colSpan="2" style={styles.thCellDescription}>Description</th>
              <th style={styles.thCellAmount}>Amount</th>
            </tr>

            {formData.bills.map((bill, i) => (
              <tr key={i}>
                <td style={styles.cell}>{i + 1}</td>
                <td style={styles.cell}>
                  <input type="text" value={bill.billNo} onChange={(e) => handleBillChange(i, "billNo", e.target.value)} style={styles.inputSmall} />
                </td>
                <td style={styles.cell}>
                  <input type="text" value={bill.billDate} onChange={(e) => handleBillChange(i, "billDate", e.target.value)} style={styles.inputSmall} placeholder="dd-mmm-yy" />
                </td>
                <td colSpan="2" style={styles.cell}>
                  <input type="text" value={bill.description} onChange={(e) => handleBillChange(i, "description", e.target.value)} style={styles.inputSmall} />
                </td>
                <td style={styles.cell}>
                  <input type="text" value={bill.amount} onChange={(e) => handleBillChange(i, "amount", e.target.value)} style={styles.inputSmall} />
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan="5" style={{ ...styles.cell, textAlign: "right", fontWeight: "bold" }}>Total Rs.</td>
              <td style={{ ...styles.cell, fontWeight: "bold", fontSize: "14px" }}>{formData.totalExpenses.toFixed(2)}</td>
            </tr>

            <tr>
              <td style={styles.labelCell}>Amt. in Words :</td>
              <td colSpan="5" style={styles.inputCell}>
                <input type="text" value={formData.amtInWords} readOnly style={{ ...styles.input, backgroundColor: "#f9f9f9" }} />
              </td>
            </tr>

            <tr>
              <td rowSpan="2" style={styles.labelCell}>Payment Details<br />- Cheque/Online</td>
              <td colSpan="3" style={styles.labelCell}>Voucher No.:</td>
              <td colSpan="2" style={styles.inputCell}>
                <input type="text" value={formData.voucherNo} readOnly style={styles.input} />
              </td>
            </tr>
            <tr>
              <td colSpan="3" style={styles.labelCell}>Payment Date:</td>
              <td colSpan="2" style={styles.inputCell}>
                <input type="text" value={formData.paymentDate} onChange={(e) => handleInputChange("paymentDate", e.target.value)} style={styles.input} placeholder="dd-mmm-yy" />
              </td>
            </tr>

            <tr>
              <td colSpan="6" style={{ ...styles.cell, height: "60px" }}>&nbsp;</td>
            </tr>

            <tr>
              <td style={styles.signCell}>
                <strong>Prepared By - Name & Sign</strong><br />
                <input type="text" value={formData.preparedBy} onChange={(e) => handleInputChange("preparedBy", e.target.value)} style={styles.inputSmall} placeholder="Name" />
              </td>
              <td colSpan="2" style={styles.signCell}>
                <strong>Receiver's Signature</strong><br />
                <input type="text" value={formData.receiverSign} onChange={(e) => handleInputChange("receiverSign", e.target.value)} style={styles.inputSmall} />
              </td>
              <td colSpan="2" style={styles.signCell}>
                <strong>Accounts - Name & Sign</strong><br />
                <input type="text" value={formData.accountsSign} onChange={(e) => handleInputChange("accountsSign", e.target.value)} style={styles.inputSmall} />
              </td>
              <td style={styles.signCell}>
                <strong>Authorised Signatory</strong><br />
                <input type="text" value={formData.authorizedSignatory} onChange={(e) => handleInputChange("authorizedSignatory", e.target.value)} style={styles.inputSmall} />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={handleSubmit} style={{ padding: "12px 30px", fontSize: 16, cursor: "pointer", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: 5, fontWeight: 500 }}>
            Submit Voucher
          </button>
        </div>

        {proofFiles.length > 0 && (
          <div style={{ marginTop: 30, padding: 20, backgroundColor: "#f9f9f9", borderRadius: 8, border: "2px solid #4CAF50" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: 16, fontWeight: "bold", color: "#333", borderBottom: "2px solid #4CAF50", paddingBottom: 10 }}>
              📎 Attached Proof Documents ({proofFiles.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {proofFiles.map((proof, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: 15, padding: 12, backgroundColor: "#fff", borderRadius: 6, border: "1px solid #ddd", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <span style={{ fontSize: 24, minWidth: 30 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 4 }}>
                      Bill #{proof.billIndex + 1} - {proof.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>Uploaded proof for bill entry {proof.billIndex + 1}</div>
                  </div>
                  <a href={proof.url} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", backgroundColor: "#2196F3", color: "#fff", textDecoration: "none", borderRadius: 4, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                    View Document
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------
// Styles
// ----------------------
const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    border: "2px solid #000",
  },
  headerMain: {
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    border: "2px solid #000",
  },
  headerSub: {
    fontSize: "10px",
    textAlign: "center",
    padding: "8px",
    border: "2px solid #000",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "8px",
    backgroundColor: "#e0e0e0",
    border: "2px solid #000",
  },
  labelCell: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
    width: "15%",
  },
  inputCell: {
    border: "1px solid #000",
    padding: "4px",
  },
  thCellSrNo: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
    width: "5%",
  },
  thCellBillNo: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
    width: "12%",
  },
  thCellBillDate: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
    width: "13%",
  },
  thCellDescription: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
    width: "50%",
  },
  thCellAmount: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
    width: "12%",
  },
  cell: {
    border: "1px solid #000",
    padding: "4px",
    fontSize: "11px",
    textAlign: "center",
  },
  signCell: {
    border: "1px solid #000",
    padding: "8px",
    fontSize: "11px",
    textAlign: "center",
    verticalAlign: "top",
    height: "70px",
  },
  input: {
    width: "98%",
    border: "none",
    padding: "4px",
    fontSize: "12px",
    outline: "none",
  },
  inputSmall: {
    width: "95%",
    border: "none",
    padding: "2px",
    fontSize: "11px",
    outline: "none",
  },
};

export default VendorPaymentForm;