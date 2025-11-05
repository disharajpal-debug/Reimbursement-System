// src/pages/vouchers/OutstationTravelForm.js
import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";

// ---------------- Number to Words ----------------
const numberToWords = (num) => {
  const a = ["", "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
             "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
             "Seventeen","Eighteen","Nineteen"];
  const b = ["", "", "Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
  if (num < 1000) return a[Math.floor(num / 100)] + " Hundred " + (num % 100 ? numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand " + (num % 1000 ? numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh " + (num % 100000 ? numberToWords(num % 100000) : "");
  return numberToWords(Math.floor(num / 10000000)) + " Crore " + (num % 10000000 ? numberToWords(num % 10000000) : "");
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
  if (!s) return 0;
  const cleaned = String(s).replace(/[^0-9.,-]/g, "");
  // Allow comma-separated multiple values like "100,200,50"
  const parts = cleaned.split(",").map((p) => parseFloat(p)).filter((n) => !isNaN(n));
  return parts.reduce((sum, n) => sum + n, 0);
};

// ---------------- Modal ----------------
const Modal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3>OCR Extracted Data</h3>
        <p><strong>Bill No:</strong> {data.billNo || "N/A"}</p>
        <p><strong>Description:</strong> {data.description || "N/A"}</p>
        <p><strong>Amount:</strong> {data.amount || "N/A"}</p>
        <div style={{ textAlign: "right" }}>
          <button onClick={onClose} style={modalStyles.button}>Cancel</button>
          <button onClick={onConfirm} style={modalStyles.button}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#fff", padding: "20px", borderRadius: "6px", width: "300px", boxShadow: "0 0 10px rgba(0,0,0,0.25)" },
  button: { margin: "5px", padding: "6px 12px", cursor: "pointer" },
};

// ---------------- OutstationTravelForm ----------------
const OutstationTravelForm = ({ loggedInUser }) => {
  const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const generateVoucherNo = () => "OTV-" + Math.floor(1000 + Math.random() * 9000);

  const initialData = {
    employeeName: loggedInUser?.name || "",
    dateFrom: todayDate,
    dateTo: todayDate,
    dateOfSubmission: todayDate,
    travelDescription: "",
    projectName: "",
    ecLocation: "Pune",
    bills: Array(10).fill().map(() => ({
      dateOfTravel: "",
      description: "",
      transport: 0,
      hotel: 0,
      meals: 0,
      phone: 0,
      misc: 0,
      total: 0,
      proof: ""
    })),
    totalExpenses: 0,
    amtInWords: "",
    advancePayment: 0,
    balanceReimbursement: 0,
    preparedBy: "",
    receiverSign: "",
    accountsSign: "",
    authorizedSignatory: "",
    voucherNo: generateVoucherNo(),
    paymentDate: todayDate,
  };

  const [formData, setFormData] = useState(initialData);
  const [uploadCount, setUploadCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [proofs, setProofs] = useState([]);

  // ✅ Auto calculate totals
  useEffect(() => {
    const total = formData.bills.reduce((sum, b) => sum + parseAmountValue(b.total), 0);
    setFormData(prev => ({
      ...prev,
      totalExpenses: total,
      amtInWords: amountToWords(total),
      balanceReimbursement: total - parseAmountValue(prev.advancePayment),
    }));
  }, [formData.bills, formData.advancePayment]);

  // ✅ Automatically fill Date of Travel based on From & To date
  useEffect(() => {
    const fromDate = new Date(formData.dateFrom);
    const toDate = new Date(formData.dateTo);
    if (isNaN(fromDate) || isNaN(toDate) || fromDate > toDate) return;

    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
    const newBills = [...formData.bills];

    for (let i = 0; i < newBills.length; i++) {
      if (i < daysDiff) {
        const d = new Date(fromDate);
        d.setDate(fromDate.getDate() + i);
        newBills[i].dateOfTravel = d.toLocaleDateString("en-GB");
      } else {
        newBills[i].dateOfTravel = "";
      }
    }
    setFormData((prev) => ({ ...prev, bills: newBills }));
  }, [formData.dateFrom, formData.dateTo]);

  const handleInputChange = (field, value) => setFormData({ ...formData, [field]: value });

  // ✅ Modified for comma-separated sums
  const handleBillChange = (index, field, value) => {
    const newBills = [...formData.bills];
    newBills[index][field] = value;

    // sum up all 5 categories properly
    const transportVal = parseAmountValue(newBills[index].transport);
    const hotelVal = parseAmountValue(newBills[index].hotel);
    const mealsVal = parseAmountValue(newBills[index].meals);
    const phoneVal = parseAmountValue(newBills[index].phone);
    const miscVal = parseAmountValue(newBills[index].misc);

    newBills[index].total = transportVal + hotelVal + mealsVal + phoneVal + miscVal;
    setFormData({ ...formData, bills: newBills });
  };

  // OCR Upload
  const handleOCRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || uploadCount >= formData.bills.length) return;

    const formDataFile = new FormData();
    formDataFile.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/api/upload", formDataFile, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const filePath = res.data.filePath;
      handleBillChange(uploadCount, "proof", filePath);

      const { data: { text } } = await Tesseract.recognize(file, "eng", { logger: (m) => console.log(m) });
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);

      const billNo = lines.find((l) => /bill|invoice/i.test(l)) || "";
      const description = lines[0] || "";
      const amountLine = [...lines].reverse().find((l) => /total|amount/i.test(l)) || "";
      const amountNumbers = amountLine ? amountLine.match(/[0-9,.]+/g) : null;
      const amount = amountNumbers ? parseFloat(amountNumbers[amountNumbers.length - 1].replace(/,/g, "")) : "";

      setOcrData({ billNo, description, amount });
      setModalOpen(true);
    } catch (err) {
      console.error("Upload/OCR Error:", err);
      alert("File upload or OCR failed");
    }
  };

  const confirmOCRData = () => {
    handleBillChange(uploadCount, "description", ocrData.description || "");
    handleBillChange(uploadCount, "misc", ocrData.amount || 0);
    setUploadCount((prev) => prev + 1);
    setModalOpen(false);
    setOcrData(null);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Not logged in");
      const res = await axios.post("http://localhost:5000/api/outstation-travel", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200 || res.status === 201) {
        alert("Outstation Travel Voucher Submitted!");
        setFormData(initialData);
        setUploadCount(0);
      } else {
        alert("Submission failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting data");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.formBackground}>
        <div style={{ marginBottom: "10px" }}>
          <strong>Upload Bill (OCR + Proof):</strong>{" "}
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const formDataFile = new FormData();
              formDataFile.append("file", file);
              try {
                const res = await axios.post("http://localhost:5000/api/uploads", formDataFile, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                const filePath = res.data.filePath;
                setProofs((prev) => [...prev, filePath]);
              } catch (err) {
                console.error("Upload Error:", err);
              }
              handleOCRUpload(e);
            }}
          />
        </div>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={confirmOCRData} data={ocrData || {}} />


        {/* ---------------- Table Layout ---------------- */}
        <table style={styles.table}>
          <thead>
            <tr><th colSpan="8" style={styles.header}>SAMARTH UDYOG TECHNOLOGY FORUM</th></tr>
            <tr><td colSpan="8" style={styles.subHeader}>CIN: U74999PN2017NPL172629<br />Registered Office: Ground Floor, SPPU Research Park Foundation,<br />Savitribai Phule Pune University, Ganeshkhind, Pune - 411 007</td></tr>
            <tr><th colSpan="8" style={styles.title}>Outstation Travel Expenses Voucher</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.cell}>Employee Name:</td>
              <td colSpan="2" style={styles.cell}><input type="text" value={formData.employeeName} onChange={(e) => handleInputChange("employeeName", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>From:</td>
              <td style={styles.cell}><input type="text" value={formData.dateFrom} onChange={(e) => handleInputChange("dateFrom", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>To:</td>
              <td colSpan="2" style={styles.cell}><input type="text" value={formData.dateTo} onChange={(e) => handleInputChange("dateTo", e.target.value)} style={styles.input} /></td>
            </tr>
            <tr>
              <td style={styles.cell}>Date of Submission:</td>
              <td colSpan="3" style={styles.cell}><input type="text" value={formData.dateOfSubmission} onChange={(e) => handleInputChange("dateOfSubmission", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>Travel Description:</td>
              <td colSpan="3" style={styles.cell}><input type="text" value={formData.travelDescription} onChange={(e) => handleInputChange("travelDescription", e.target.value)} style={styles.input} /></td>
            </tr>
            <tr>
              <td style={styles.cell}>Project Name:</td>
              <td colSpan="7" style={styles.cell}><input type="text" value={formData.projectName} onChange={(e) => handleInputChange("projectName", e.target.value)} style={styles.input} /></td>
            </tr>
            <tr>
              <td style={styles.cell}>EC Location:</td>
              <td colSpan="7" style={styles.cell}><input type="text" value={formData.ecLocation} onChange={(e) => handleInputChange("ecLocation", e.target.value)} style={styles.input} /></td>
            </tr>

            {/* Table Head */}
            <tr>
              <th style={styles.cell}>Date of Travel</th>
              <th style={styles.cell}>Description</th>
              <th style={styles.cell}>Transport</th>
              <th style={styles.cell}>Hotel</th>
              <th style={styles.cell}>Meals</th>
              <th style={styles.cell}>Phone</th>
              <th style={styles.cell}>Misc.</th>
              <th style={styles.cell}>Total</th>
            </tr>

            {formData.bills.map((bill, i) => (
              <tr key={i}>
                <td style={styles.cell}><input type="text" value={bill.dateOfTravel} onChange={(e) => handleBillChange(i, "dateOfTravel", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.description} onChange={(e) => handleBillChange(i, "description", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.transport} onChange={(e) => handleBillChange(i, "transport", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.hotel} onChange={(e) => handleBillChange(i, "hotel", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.meals} onChange={(e) => handleBillChange(i, "meals", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.phone} onChange={(e) => handleBillChange(i, "phone", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}><input type="text" value={bill.misc} onChange={(e) => handleBillChange(i, "misc", e.target.value)} style={styles.input} /></td>
                <td style={styles.cell}>{bill.total}</td>
              </tr>
            ))}

            {/* Totals */}
            <tr>
              <td colSpan="7" style={{ ...styles.cell, textAlign: "right" }}>Total Expenses</td>
              <td style={styles.cell}>{formData.totalExpenses}</td>
            </tr>
            <tr>
              <td colSpan="8" style={styles.cell}>Total in Words: {formData.amtInWords}</td>
            </tr>
            <tr>
              <td colSpan="8" style={styles.cell}>
                Total Expenses: {formData.totalExpenses} <br />
                Advance Payment: <input type="text" value={formData.advancePayment} onChange={(e) => handleInputChange("advancePayment", e.target.value)} style={styles.input} /><br />
                Balance Reimbursement: {formData.balanceReimbursement}
              </td>
            </tr>
            <tr>
              <td style={styles.cell}>Payment Date:</td>
              <td style={styles.cell}><input type="text" value={formData.paymentDate} onChange={(e) => handleInputChange("paymentDate", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>Voucher No.:</td>
              <td colSpan="5" style={styles.cell}><input type="text" value={formData.voucherNo} onChange={(e) => handleInputChange("voucherNo", e.target.value)} style={styles.input} /></td>
            </tr>
            <tr>
              <td style={styles.cell}>Prepared By</td>
              <td style={styles.cell}><input type="text" value={formData.preparedBy} onChange={(e) => handleInputChange("preparedBy", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>Receiver's Signature</td>
              <td style={styles.cell}><input type="text" value={formData.receiverSign} onChange={(e) => handleInputChange("receiverSign", e.target.value)} style={styles.input} /></td>
              <td style={styles.cell}>Accounts</td>
              <td style={styles.cell}><input type="text" value={formData.accountsSign} onChange={(e) => handleInputChange("accountsSign", e.target.value)} style={styles.input} /></td>
              <td colSpan="2" style={styles.cell}>Authorized Signatory<br /><input type="text" value={formData.authorizedSignatory} onChange={(e) => handleInputChange("authorizedSignatory", e.target.value)} style={styles.input} /></td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button style={{ padding: "8px 16px", fontSize: "14px", cursor: "pointer", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "4px" }} onClick={handleSubmit}>
            Submit
          </button>
        </div>

        {/* Proof Display Section */}
        {proofs.length > 0 && (
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px", border: "1px solid #ddd" }}>
            <h4 style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold", color: "#333" }}>📎 Attached Proof Documents:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {proofs.map((proof, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                  <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>📄 Proof {index + 1}:</span>
                  <a 
                    href={`http://localhost:5000${proof}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: "#0066cc", textDecoration: "underline", fontWeight: "500" }}
                  >
                    View Document
                  </a>
                  <span style={{ fontSize: "12px", color: "#999", marginLeft: "auto" }}>
                    {proof.split('/').pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { padding: "20px", fontFamily: "Arial, sans-serif" },
  formBackground: { background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "20px" },
  header: { textAlign: "center", fontWeight: "bold", fontSize: "18px", padding: "8px", border: "1px solid #000" },
  subHeader: { textAlign: "center", fontSize: "12px", padding: "6px", border: "1px solid #000" },
  title: { textAlign: "center", fontWeight: "bold", fontSize: "16px", padding: "6px", border: "1px solid #000" },
  cell: { border: "1px solid #000", padding: "6px", fontSize: "12px", textAlign: "center" },
  input: { width: "95%", fontSize: "12px", padding: "2px" },
};

export default OutstationTravelForm;
