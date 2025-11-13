// src/pages/vouchers/LocalTravelForm.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import OCRUpload from "../../components/OCRUpload";

// --- Number to Words (Indian Format) ---
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
  if (!s) return 0;
  const cleaned = String(s).replace(/[^0-9.-]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

// --- Modal for OCR Preview ---
const Modal = ({ isOpen, onClose, onConfirm, data, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#333" }}>
          {isProcessing ? "Processing OCR..." : "Confirm Extracted Data"}
        </h3>
        {isProcessing ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div
              style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                margin: "0 auto 15px auto",
              }}
            ></div>
            <p>Extracting bill information...</p>
          </div>
        ) : (
          <>
            <div style={modalStyles.dataRow}>
              <strong>Bill No:</strong> <span>{data.billNo || "N/A"}</span>
            </div>
            <div style={modalStyles.dataRow}>
              <strong>Vendor Name:</strong>{" "}
              <span>{data.vendorName || "N/A"}</span>
            </div>
            <div style={modalStyles.dataRow}>
              <strong>Amount:</strong> <span>{data.amount || "N/A"}</span>
            </div>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={onClose}
                style={{ ...modalStyles.button, backgroundColor: "#f44336" }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{ ...modalStyles.button, backgroundColor: "#4CAF50" }}
              >
                Confirm & Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "8px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
  },
  button: {
    margin: "0 5px",
    padding: "10px 20px",
    cursor: "pointer",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "14px",
  },
};

// --- Local Travel Voucher Component ---
const LocalTravelForm = ({ loggedInUser }) => {
  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const generateVoucherNo = () =>
    "LTV-" + Math.floor(1000 + Math.random() * 9000);

  const initialData = {
    employeeName: loggedInUser?.name || "",
    date: todayDate,
    voucherNo: generateVoucherNo(),
    paymentDate: todayDate,
    paymentMode: "Cash / Bank",
    projectName: "",
    ecLocation: "Pune",
    bills: Array(10)
      .fill()
      .map(() => ({ billNo: "", vendorName: "", description: "", amount: "" })),
    totalExpenses: 0,
    amtInWords: "",
    preparedBy: "",
    receiverSign: "",
    accountsSign: "",
    authorizedSignatory: "",
  };

  const [formData, setFormData] = useState(initialData);
  const [uploadCount, setUploadCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [proofs, setProofs] = useState([]);

  // Fetch logged-in user
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFormData((prev) => ({ ...prev, employeeName: res.data.name || "" }));
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchEmployee();
  }, []);

  // Auto update totals
  useEffect(() => {
    const total = formData.bills.reduce(
      (sum, b) => sum + parseAmountValue(b.amount),
      0
    );
    setFormData((prev) => ({
      ...prev,
      totalExpenses: total.toFixed(2),
      amtInWords: amountToWords(total),
    }));
  }, [formData.bills]);

  // Handlers
  const handleInputChange = (field, value) =>
    setFormData({ ...formData, [field]: value });
  const handleBillChange = (index, field, value) => {
    const newBills = [...formData.bills];
    newBills[index][field] = value;
    setFormData({ ...formData, bills: newBills });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || uploadCount >= formData.bills.length) {
      if (uploadCount >= formData.bills.length) {
        alert("Maximum bill entries reached!");
      }
      return;
    }

    setModalOpen(true);
    setIsProcessing(true);

    try {
      // Upload proof to server
      const formDataFile = new FormData();
      formDataFile.append("file", file);
      const uploadRes = await axios.post(
        "http://localhost:5000/api/uploads",
        formDataFile,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      const filePath = uploadRes.data.filePath;
      console.log("✅ Proof uploaded successfully:", filePath);

      // OCR handling is now done by OCRUpload component

      // Just update proofs for this uploaded file
      setProofs((prev) => [
        ...prev,
        { path: filePath, billIndex: uploadCount },
      ]);
      setIsProcessing(false);
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Error processing bill. Please try again.");
      setModalOpen(false);
      setIsProcessing(false);
    }

    // Reset file input
    e.target.value = "";
  };

  const confirmOCRData = () => {
    if (ocrData) {
      handleBillChange(uploadCount, "billNo", ocrData.billNo || "");
      handleBillChange(uploadCount, "vendorName", ocrData.vendorName || "");
      handleBillChange(uploadCount, "amount", ocrData.amount || "");
      setUploadCount((prev) => prev + 1);
    }
    setModalOpen(false);
    setOcrData(null);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Not logged in");

      const payload = {
        ...formData,
        amount: formData.totalExpenses,
        proofs: proofs.map((p) => p.path),
      };

      const res = await axios.post(
        "http://localhost:5000/api/local-travel",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 200 || res.status === 201) {
        alert("Local Travel Voucher Submitted Successfully!");
        setFormData(initialData);
        setUploadCount(0);
        setProofs([]);
      } else {
        alert("Submission failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting data");
    }
  };

  // Print current form (includes proofs)
  const printRef = useRef(null);

  // Print by cloning the live DOM node to preserve exact layout
  const handlePrint = (data) => {
    try {
      const node = printRef.current;
      if (!node) return alert("Print area not found");
      const clone = node.cloneNode(true);

      // Replace inputs/textarea/select in clone with plain text so printed layout wraps text
      try {
        const origFields = node.querySelectorAll("input,textarea,select");
        const cloneFields = clone.querySelectorAll("input,textarea,select");
        for (let i = 0; i < cloneFields.length; i++) {
          const c = cloneFields[i];
          const o = origFields[i];
          if (!c) continue;
          let text = "";
          try {
            if (o) {
              if (o.tagName === "INPUT") {
                const type = (o.getAttribute("type") || "").toLowerCase();
                if (type === "checkbox" || type === "radio")
                  text = o.checked ? "☑" : "☐";
                else text = o.value || "";
              } else if (o.tagName === "TEXTAREA") {
                text = o.value || "";
              } else if (o.tagName === "SELECT") {
                text =
                  (o.options[o.selectedIndex] &&
                    o.options[o.selectedIndex].text) ||
                  o.value ||
                  "";
              }
            }
          } catch (e) {
            text = "";
          }
          const d = document.createElement("div");
          d.textContent = text;
          d.style.whiteSpace = "normal";
          d.style.display = "block";
          d.style.wordWrap = "break-word";
          d.style.overflowWrap = "anywhere";
          if (c.parentNode) c.parentNode.replaceChild(d, c);
        }
      } catch (err) {
        console.warn("replace fields for print failed", err);
      }

      // convert proof links to images for printing
      const anchors = clone.querySelectorAll("a");
      anchors.forEach((a) => {
        const href = a.getAttribute("href") || a.href || "";
        if (!href) return;
        if (
          /\.(jpe?g|png|gif|webp)$/i.test(href) ||
          /uploads/i.test(href) ||
          href.includes("/api/uploads")
        ) {
          const img = document.createElement("img");
          img.src = href.startsWith("http")
            ? href
            : `http://localhost:5000${href}`;
          img.style.maxWidth = "260px";
          img.style.display = "block";
          img.style.margin = "6px 0";
          if (a.parentNode) a.parentNode.replaceChild(img, a);
        }
      });

      // Strip upload widgets and interactive controls from cloned print DOM
      try {
        const hideSelectors = [
          'input[type="file"]',
          ".uploadButton",
          ".uploadSection",
          ".uploadLabel",
          ".uploadInfo",
          ".submitSection",
          ".submitButton",
          ".printButton",
        ];
        hideSelectors.forEach((sel) =>
          clone.querySelectorAll(sel).forEach((n) => n.remove())
        );
        Array.from(clone.querySelectorAll("*")).forEach((el) => {
          try {
            const t = (el.textContent || "").trim().toLowerCase();
            if (!t) return;
            if (
              t.length < 60 &&
              /upload\s*bill|upload\b|upload\s*proof/i.test(t)
            )
              el.remove();
          } catch (e) {}
        });
      } catch (err) {
        console.warn("strip UI for print failed", err);
      }

      // Put proofs on the next page (search for proof headings/containers)
      try {
        Array.from(clone.querySelectorAll("div,section")).forEach((el) => {
          const t = (el.textContent || "").toLowerCase();
          if (
            t.includes("attached proof") ||
            t.includes("attached proofs") ||
            t.includes("attached proof documents") ||
            t.includes("proof documents")
          ) {
            el.style.pageBreakBefore = "always";
            el.style.breakBefore = "page";
          }
        });
      } catch (err) {
        console.warn("mark proofs for page break failed", err);
      }

      const wrapper = document.createElement("div");
      wrapper.appendChild(clone);
      const printStyles = `
        <style>
          html,body{font-family: Arial, Helvetica, sans-serif; padding:10px}
          table{width:100%; border-collapse:collapse; table-layout:fixed}
          th,td{word-wrap:break-word; overflow-wrap:anywhere; white-space:normal;}
          input,textarea{white-space:normal; word-wrap:break-word; overflow-wrap:anywhere}
          img{max-width:100%; height:auto}
          th, td { padding: 4px !important; height: auto !important; }
          td, th { line-height: 1.15 !important; }
          .signCell { height: auto !important; min-height: 0 !important; }
          input, textarea { border: none !important; }
          @media print { input[type="file"], .uploadButton, .uploadSection, .uploadLabel, .uploadInfo, .submitSection, button { display: none !important; } }
        </style>
      `;
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print - ${
        data.voucherNo || "Voucher"
      }</title>${printStyles}</head><body>${
        wrapper.innerHTML
      }<script>setTimeout(()=>window.print(),300)</script></body></html>`;
      const w = window.open("", "_blank");
      if (!w) return alert("Popup blocked - allow popups to print");
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (err) {
      console.error("Print fail", err);
      alert("Unable to print");
    }
  };

  return (
    <div style={styles.page} ref={printRef}>
      <div style={styles.container}>
        {/* Upload Section */}
        <div style={styles.uploadSection}>
          <h4 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>
            📤 Upload Bill
          </h4>
          <OCRUpload
            onOCRComplete={(mappedData) => {
              // Find first empty row
              const emptyIndex =
                formData.bills.findIndex((b) => !b.billNo && !b.amount) || 0;

              // mapOCRDataToForm returns normalized keys: billNumber, vendorName, amount, date, description
              handleBillChange(
                emptyIndex,
                "billNo",
                mappedData.billNumber || ""
              );
              handleBillChange(
                emptyIndex,
                "vendorName",
                mappedData.vendorName || ""
              );
              handleBillChange(emptyIndex, "amount", mappedData.amount || 0);
              handleBillChange(
                emptyIndex,
                "description",
                mappedData.description || "Local Travel Expense"
              );
              handleBillChange(emptyIndex, "date", mappedData.date || "");

              // attach proof if returned (store as object with bill index)
              if (mappedData.proofPath) {
                const filename = mappedData.proofPath.split("/").pop();
                setProofs((prev) => [
                  ...prev,
                  {
                    path: mappedData.proofPath,
                    billIndex: emptyIndex,
                    filename,
                  },
                ]);
              }
            }}
            formType="local"
          />
        </div>

        {/* Voucher Form */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th colSpan="5" style={styles.header}>
                SAMARTH UDYOG TECHNOLOGY FORUM
              </th>
            </tr>
            <tr>
              <td colSpan="5" style={styles.subHeader}>
                CIN: U74999PN2017NPL172629
                <br />
                Registered Office: Ground Floor, SPPU Research Park Foundation,
                <br />
                Savitribai Phule Pune University, Ganeshkhind, Pune - 411 007
              </td>
            </tr>
            <tr>
              <th colSpan="5" style={styles.title}>
                Local Travel Expenses Voucher
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Employee Name, Date, Voucher No */}
            <tr>
              <td style={styles.labelCell}>Employee Name:</td>
              <td style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) =>
                    handleInputChange("employeeName", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.labelCell}>Date:</td>
              <td style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  style={styles.input}
                />
              </td>
              <td style={styles.inputCell}>
                <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                  Voucher No.:
                </div>
                <input
                  type="text"
                  value={formData.voucherNo}
                  onChange={(e) =>
                    handleInputChange("voucherNo", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>

            {/* Payment Date, Payment Mode */}
            <tr>
              <td style={styles.labelCell}>Payment Date:</td>
              <td style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    handleInputChange("paymentDate", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.labelCell}>Payment Mode:</td>
              <td colSpan="2" style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.paymentMode}
                  onChange={(e) =>
                    handleInputChange("paymentMode", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>

            {/* Project Name */}
            <tr>
              <td style={styles.labelCell}>Project Name:</td>
              <td colSpan="4" style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>

            {/* EC Location */}
            <tr>
              <td style={styles.labelCell}>EC Location:</td>
              <td colSpan="4" style={styles.inputCell}>
                <input
                  type="text"
                  value={formData.ecLocation}
                  onChange={(e) =>
                    handleInputChange("ecLocation", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>

            {/* Bill Details Header */}
            <tr>
              <th style={styles.headerCell}>Sr No.</th>
              <th style={styles.headerCell}>Bill No</th>
              <th style={styles.headerCell}>Vendor Name</th>
              <th style={styles.headerCell}>Description</th>
              <th style={styles.headerCell}>Amount</th>
            </tr>

            {/* Bill Rows */}
            {formData.bills.map((bill, i) => (
              <tr
                key={i}
                style={i < uploadCount ? { backgroundColor: "#e8f5e9" } : {}}
              >
                <td style={styles.cell}>{i + 1}</td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.billNo}
                    onChange={(e) =>
                      handleBillChange(i, "billNo", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.vendorName}
                    onChange={(e) =>
                      handleBillChange(i, "vendorName", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.description}
                    onChange={(e) =>
                      handleBillChange(i, "description", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.amount}
                    onChange={(e) =>
                      handleBillChange(i, "amount", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
              </tr>
            ))}

            {/* Total */}
            <tr>
              <td
                colSpan="4"
                style={{
                  ...styles.cell,
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                Total Rs.
              </td>
              <td style={{ ...styles.cell, fontWeight: "bold" }}>
                ₹ {formData.totalExpenses}
              </td>
            </tr>

            {/* Amount in Words */}
            <tr>
              <td colSpan="5" style={styles.cell}>
                <strong>Amt. In Words:</strong>{" "}
                <input
                  type="text"
                  value={formData.amtInWords}
                  readOnly
                  style={{
                    ...styles.input,
                    width: "calc(100% - 120px)",
                    marginLeft: "5px",
                  }}
                />
              </td>
            </tr>

            {/* Signatures */}
            <tr>
              <td style={{ ...styles.signCell }}>
                <div style={styles.signLabel}>Prepared By</div>
                <div style={styles.signLine}></div>
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) =>
                    handleInputChange("preparedBy", e.target.value)
                  }
                  style={styles.signInput}
                  placeholder="Name"
                />
              </td>
              <td style={{ ...styles.signCell }}>
                <div style={styles.signLabel}>Receiver's Signature</div>
                <div style={styles.signLine}></div>
                <input
                  type="text"
                  value={formData.receiverSign}
                  onChange={(e) =>
                    handleInputChange("receiverSign", e.target.value)
                  }
                  style={styles.signInput}
                  placeholder="Name"
                />
              </td>
              <td style={{ ...styles.signCell }}>
                <div style={styles.signLabel}>Accounts - Name & Sign</div>
                <div style={styles.signLine}></div>
                <input
                  type="text"
                  value={formData.accountsSign}
                  onChange={(e) =>
                    handleInputChange("accountsSign", e.target.value)
                  }
                  style={styles.signInput}
                  placeholder="Name"
                />
              </td>
              <td colSpan="2" style={{ ...styles.signCell }}>
                <div style={styles.signLabel}>Authorized Signatory</div>
                <div style={styles.signLine}></div>
                <input
                  type="text"
                  value={formData.authorizedSignatory}
                  onChange={(e) =>
                    handleInputChange("authorizedSignatory", e.target.value)
                  }
                  style={styles.signInput}
                  placeholder="Name"
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Attached Proofs */}
        {proofs.length > 0 && (
          <div style={styles.proofsSection}>
            <h4 style={styles.proofsTitle}>📎 Attached Proof Documents:</h4>
            <div style={styles.proofsGrid}>
              {proofs.map((proof, index) => (
                <div key={index} style={styles.proofItem}>
                  <span style={styles.proofLabel}>
                    Bill {proof.billIndex + 1}:
                  </span>
                  <a
                    href={`http://localhost:5000${proof.path}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.proofLink}
                  >
                    View Document
                  </a>
                  <span style={styles.proofFileName}>
                    {proof.path.split("/").pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div style={styles.submitSection}>
          <button style={styles.submitButton} onClick={handleSubmit}>
            Submit Voucher
          </button>
          <button
            style={{
              ...styles.submitButton,
              backgroundColor: "#1976D2",
              marginLeft: 12,
            }}
            onClick={() => handlePrint({ ...formData, proofs })}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    backgroundColor: "#fff",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    borderRadius: "8px",
  },
  uploadSection: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: "6px",
    border: "2px dashed #ccc",
    textAlign: "center",
  },
  uploadLabel: {
    cursor: "pointer",
  },
  uploadButton: {
    display: "inline-block",
    padding: "12px 24px",
    backgroundColor: "#2196F3",
    color: "#fff",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    border: "2px solid #000",
  },
  header: {
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    border: "1px solid #000",
  },
  subHeader: {
    fontSize: "10px",
    textAlign: "center",
    padding: "8px",
    border: "1px solid #000",
    lineHeight: "1.4",
  },
  title: {
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "8px",
    backgroundColor: "#e0e0e0",
    border: "1px solid #000",
  },
  labelCell: {
    border: "1px solid #000",
    padding: "6px",
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
    width: "15%",
  },
  inputCell: {
    border: "1px solid #000",
    padding: "4px",
  },
  headerCell: {
    border: "1px solid #000",
    padding: "6px",
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    textAlign: "center",
  },
  cell: {
    border: "1px solid #000",
    padding: "4px",
  },
  input: {
    width: "100%",
    border: "none",
    padding: "4px",
    fontSize: "12px",
    boxSizing: "border-box",
    backgroundColor: "transparent",
  },
  signCell: {
    border: "1px solid #000",
    padding: "8px",
    height: "80px",
    verticalAlign: "top",
  },
  signLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  signLine: {
    height: "40px",
  },
  signInput: {
    width: "100%",
    border: "none",
    borderTop: "1px solid #ccc",
    padding: "4px",
    fontSize: "11px",
    marginTop: "5px",
  },
  proofsSection: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    borderRadius: "6px",
    border: "1px solid #ddd",
  },
  proofsTitle: {
    marginTop: 0,
    marginBottom: "12px",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
  },
  proofsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  proofItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
  },
  proofLabel: {
    fontSize: "13px",
    color: "#666",
    fontWeight: "600",
    minWidth: "60px",
  },
  proofLink: {
    color: "#2196F3",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "13px",
  },
  proofFileName: {
    fontSize: "11px",
    color: "#999",
    marginLeft: "auto",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  submitSection: {
    marginTop: "20px",
    textAlign: "center",
  },
  submitButton: {
    padding: "12px 40px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    transition: "background-color 0.3s",
  },
};

export default LocalTravelForm;
