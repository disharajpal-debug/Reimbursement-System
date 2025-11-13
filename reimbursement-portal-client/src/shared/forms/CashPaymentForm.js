import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import OCRUpload from "../../components/OCRUpload";

// Convert number to words (Indian system)
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

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "6px",
    width: "420px",
    boxShadow: "0 0 10px rgba(0,0,0,0.25)",
  },
  button: { margin: "5px", padding: "6px 12px", cursor: "pointer" },
};

// Modal Component for OCR confirmation (editable)
const Modal = ({ isOpen, onClose, onConfirm, data }) => {
  // Local editable copy so user can tweak OCR values before confirming
  const [local, setLocal] = useState({
    billNo: data?.billNo || "",
    vendorName: data?.vendorName || "",
    amount: data?.amount || "",
    date: data?.date || "",
    gstNumber: data?.gstNumber || "",
    description: data?.description || "",
  });

  // keep local copy in sync when data prop changes
  useEffect(() => {
    setLocal({
      billNo: data?.billNo || "",
      vendorName: data?.vendorName || "",
      amount: data?.amount || "",
      date: data?.date || "",
      gstNumber: data?.gstNumber || "",
      description: data?.description || "",
    });
  }, [data]);

  if (!isOpen) return null;

  const handleCancel = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(local);
  };

  const onChangeField = (field, value) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3>OCR Extracted Data</h3>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12 }}>Bill No:</label>
          <input
            type="text"
            value={local.billNo}
            onChange={(e) => onChangeField("billNo", e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              boxSizing: "border-box",
              marginTop: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12 }}>Vendor Name:</label>
          <input
            type="text"
            value={local.vendorName}
            onChange={(e) => onChangeField("vendorName", e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              boxSizing: "border-box",
              marginTop: 4,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12 }}>Amount:</label>
            <input
              type="text"
              value={local.amount}
              onChange={(e) => onChangeField("amount", e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                boxSizing: "border-box",
                marginTop: 4,
              }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ fontSize: 12 }}>Date:</label>
            <input
              type="text"
              value={local.date}
              onChange={(e) => onChangeField("date", e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                boxSizing: "border-box",
                marginTop: 4,
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12 }}>GST / Tax No:</label>
          <input
            type="text"
            value={local.gstNumber}
            onChange={(e) => onChangeField("gstNumber", e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              boxSizing: "border-box",
              marginTop: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12 }}>Description:</label>
          <input
            type="text"
            value={local.description}
            onChange={(e) => onChangeField("description", e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              boxSizing: "border-box",
              marginTop: 4,
            }}
          />
        </div>

        <div style={{ textAlign: "right", marginTop: 8 }}>
          <button onClick={handleCancel} style={modalStyles.button}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={modalStyles.button}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const CashPaymentForm = ({ loggedInUser }) => {
  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const generateVoucherNo = () =>
    "VCH-" + Math.floor(1000 + Math.random() * 9000);

  const initialData = {
    employeeName: loggedInUser?.name || "",
    date: todayDate,
    voucherNo: generateVoucherNo(),
    paymentDate: todayDate,
    projectName: "",
    ecLocation: "Pune",
    bills: Array(10)
      .fill()
      .map(() => ({
        billNo: "",
        vendorName: "",
        description: "",
        amount: "",
        proof: "",
      })),
    totalExpenses: 0,
    advancePayment: 0,
    balanceReimbursement: 0,
    amtInWords: "",
    preparedBy: "",
    receiverSign: "",
    accountsSign: "",
    authorizedSignatory: "",
  };

  const [formData, setFormData] = useState(initialData);
  const [proofs, setProofs] = useState([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [currentProofPath, setCurrentProofPath] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch logged-in employee name from backend
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const employeeName = res.data.name || "";
        setFormData((prev) => ({ ...prev, employeeName }));
      } catch (err) {
        console.error("Error fetching employee info:", err);
      }
    };

    fetchEmployee();
  }, []);

  // Update totals automatically
  useEffect(() => {
    const totalNumeric = formData.bills.reduce(
      (sum, b) => sum + parseAmountValue(b.amount),
      0
    );
    const advanceNumeric = parseAmountValue(formData.advancePayment);
    const balance = totalNumeric - advanceNumeric;
    setFormData((prev) => ({
      ...prev,
      totalExpenses: Number(totalNumeric.toFixed(2)),
      balanceReimbursement: Number(balance.toFixed(2)),
      amtInWords: amountToWords(Number(totalNumeric.toFixed(2))),
    }));
  }, [formData.bills, formData.advancePayment]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const handleBillChange = (index, field, value) => {
    const newBills = [...formData.bills];
    newBills[index][field] = value;
    setFormData({ ...formData, bills: newBills });
  };

  // OCR processing handler (mapped data from mapOCRDataToForm)
  const handleOCRComplete = (mappedData) => {
    if (!mappedData || uploadCount >= formData.bills.length) return;

    // mapOCRDataToForm returns normalized keys: billNumber, vendorName, amount/totalAmount, date, gstNumber, description
    const payload = {
      billNo: mappedData.billNumber || mappedData.invoiceNumber || "",
      vendorName: mappedData.vendorName || "",
      amount: mappedData.amount || mappedData.totalAmount || "",
      date: mappedData.date || mappedData.billDate || "",
      gstNumber: mappedData.gstNumber || "",
      description:
        mappedData.description ||
        mappedData.items?.map((i) => i.description).join(", ") ||
        "",
      proofPath: mappedData.proofPath || null,
    };

    setOcrData(payload);
    // store proof path so confirm will attach the proof
    if (mappedData.proofPath) setCurrentProofPath(mappedData.proofPath);
    setModalOpen(true);
  };

  const confirmOCRData = (confirmed) => {
    if (!confirmed) {
      setModalOpen(false);
      setOcrData(null);
      return;
    }

    handleBillChange(uploadCount, "billNo", confirmed.billNo || "");
    handleBillChange(uploadCount, "vendorName", confirmed.vendorName || "");
    handleBillChange(uploadCount, "description", confirmed.description || "");
    handleBillChange(uploadCount, "amount", confirmed.amount || "");

    // store date/gst into the bill object if you want to keep them
    handleBillChange(uploadCount, "date", confirmed.date || "");
    handleBillChange(uploadCount, "gstNumber", confirmed.gstNumber || "");

    // Add proof only when confirmed (saved server path available in currentProofPath)
    if (currentProofPath) {
      const filename = currentProofPath.split("/").pop();
      setProofs((prev) => [
        ...prev,
        { path: currentProofPath, billIndex: uploadCount, filename },
      ]);
    }

    setUploadCount((prev) => prev + 1);
    setModalOpen(false);
    setOcrData(null);
    setCurrentProofPath(null);
  };

  // Validation check
  const validateForm = () => {
    let newErrors = {};
    if (!formData.employeeName) newErrors.employeeName = true;
    if (!formData.date) newErrors.date = true;
    if (!formData.voucherNo) newErrors.voucherNo = true;
    if (!formData.paymentDate) newErrors.paymentDate = true;
    if (!formData.projectName) newErrors.projectName = true;
    formData.bills.forEach((b, i) => {
      if (b.billNo || b.vendorName || b.amount) {
        if (!b.billNo) newErrors[`billNo${i}`] = true;
        if (!b.vendorName) newErrors[`vendorName${i}`] = true;
        if (!b.amount) newErrors[`amount${i}`] = true;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You are not logged in!");
        return;
      }

      const payload = {
        employeeName: formData.employeeName,
        date: formData.date,
        voucherNo: formData.voucherNo,
        paymentDate: formData.paymentDate,
        projectName: formData.projectName,
        ecLocation: formData.ecLocation,
        bills: formData.bills,
        totalExpenses: formData.totalExpenses,
        advancePayment: formData.advancePayment,
        balanceReimbursement: formData.balanceReimbursement,
        amtInWords: formData.amtInWords,
        preparedBy: formData.preparedBy,
        receiverSign: formData.receiverSign,
        accountsSign: formData.accountsSign,
        authorizedSignatory: formData.authorizedSignatory,
      };

      const res = await axios.post(
        "http://localhost:5000/api/cash-payment",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200 || res.status === 201) {
        alert("Cash Payment submitted successfully!");

        // Prepare printable data (use returned data if available, else payload)
        const printable = res.data?.data || payload;
        // include proof URLs
        printable.proofs = proofs || [];

        // open print window
        handlePrint(printable);

        // reset form after printing
        setFormData(initialData);
        setUploadCount(0);
        setProofs([]);
      } else {
        alert("Submission failed.");
      }
    } catch (err) {
      console.error(
        "Submission Error:",
        err.response?.data || err.message || err
      );
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        "Unknown error occurred";
      alert(`Error submitting data: ${errorMessage}`);
    }
  };

  // Print helper: preserve exact on-screen layout by cloning the form DOM
  const printRef = useRef(null);

  const handlePrint = (dataToPrint) => {
    try {
      const node = printRef.current;
      if (!node) {
        alert("Print area not found");
        return;
      }

      // Clone the node to avoid messing with the live DOM
      const clone = node.cloneNode(true);

      // Replace input/textarea/select elements in the cloned node with plain text so values wrap in print
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
                if (type === "checkbox" || type === "radio") {
                  text = o.checked ? "☑" : "☐";
                } else {
                  text = o.value || "";
                }
              } else if (o.tagName === "TEXTAREA") {
                text = o.value || "";
              } else if (o.tagName === "SELECT") {
                try {
                  text =
                    (o.options[o.selectedIndex] &&
                      o.options[o.selectedIndex].text) ||
                    "";
                } catch (e) {
                  text = o.value || "";
                }
              }
            }
          } catch (e) {
            text = "";
          }

          const span = document.createElement("div");
          span.textContent = text;
          span.style.whiteSpace = "normal";
          span.style.display = "block";
          span.style.wordWrap = "break-word";
          span.style.overflowWrap = "anywhere";
          span.style.fontFamily = "inherit";
          span.style.fontSize =
            window.getComputedStyle && window.getComputedStyle(c).fontSize
              ? window.getComputedStyle(c).fontSize
              : "12px";
          if (c.parentNode) c.parentNode.replaceChild(span, c);
        }
      } catch (err) {
        console.warn("replace fields for print failed", err);
      }

      // Replace proof links with images so printed output shows images
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
          img.style.maxWidth = "280px";
          img.style.display = "block";
          img.style.margin = "6px 0";
          if (a.parentNode) a.parentNode.replaceChild(img, a);
        }
      });

      // Remove UI elements we don't want in print (file inputs, upload widgets, buttons, submit/print controls) and small upload labels
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
        hideSelectors.forEach((sel) => {
          clone.querySelectorAll(sel).forEach((n) => n.remove());
        });

        // Remove small nodes that are just upload labels like "Upload Bill:" or "Upload Bill (Proof only):"
        Array.from(clone.querySelectorAll("*")).forEach((el) => {
          try {
            const t = (el.textContent || "").trim();
            if (!t) return;
            const low = t.toLowerCase();
            if (
              low.length < 60 &&
              /upload\s*bill|upload\s*proof|upload\b/i.test(low)
            ) {
              el.remove();
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (err) {
        console.warn("remove print-only nodes failed", err);
      }

      // Ensure proofs appear on their own page: find proof containers by heading text and force page-break before
      try {
        const possibleProofContainers = Array.from(
          clone.querySelectorAll("div,section")
        );
        possibleProofContainers.forEach((el) => {
          const text = (el.textContent || "").toLowerCase();
          if (
            text.includes("attached proofs") ||
            text.includes("attached proof") ||
            text.includes("attached proof documents") ||
            text.includes("proofs")
          ) {
            el.style.pageBreakBefore = "always";
            el.style.breakBefore = "page";
            el.style.marginTop = "10px";
          }
        });
      } catch (err) {
        console.warn("mark proofs page break failed", err);
      }

      const wrapper = document.createElement("div");
      wrapper.appendChild(clone);

      // Print CSS to force wrapping in table cells and inputs and hide file-upload UI
      const printStyles = `
        <style>
          html,body{font-family: Arial, Helvetica, sans-serif; padding:10px;}
          table{width:100%; border-collapse:collapse; table-layout:fixed;}
          th,td{word-wrap:break-word; overflow-wrap:anywhere; white-space:normal; vertical-align:top;}
          input,textarea{white-space:normal; word-wrap:break-word; overflow-wrap:anywhere;}
          img{max-width:100%; height:auto}
          /* Reduce default padding/height for print so empty rows shrink and wrapped text flows */
          th, td { padding: 4px !important; height: auto !important; }
          td, th { line-height: 1.15 !important; }
          /* Avoid large fixed heights on signature cells during print */
          .signCell { height: auto !important; min-height: 0 !important; }
          input, textarea { border: none !important; }
          /* Hide file inputs and upload widgets in printed output */
          @media print {
            input[type="file"], .uploadButton, .uploadSection, .uploadLabel, .uploadInfo, .submitSection, button { display: none !important; }
            /* ensure proofs start on new page */
            .proofs { page-break-before: always; break-before: page; }
          }
        </style>
      `;

      const printHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Print - ${
        dataToPrint.voucherNo || "Voucher"
      }</title>${printStyles}</head><body>${
        wrapper.innerHTML
      }<script>setTimeout(()=>window.print(),300);</script></body></html>`;

      const w = window.open("", "_blank");
      if (!w) {
        alert("Popup blocked. Please allow popups for this site to print.");
        return;
      }
      w.document.open();
      w.document.write(printHtml);
      w.document.close();
      w.focus();
    } catch (err) {
      console.error("Print Error:", err);
      alert("Unable to open print window.");
    }
  };

  return (
    <div style={styles.page} ref={printRef}>
      <div style={styles.formBackground}>
        <div
          style={{
            marginBottom: "10px",
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            fontSize: "11px",
          }}
        >
          <OCRUpload onOCRComplete={handleOCRComplete} formType="cash" />
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={confirmOCRData}
          data={ocrData || {}}
        />

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
                Payment Vouchers
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Employee Name and Date Row */}
            <tr>
              <td style={styles.labelCell}>Employee Name:</td>
              <td colSpan="2" style={styles.cell}>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) =>
                    handleInputChange("employeeName", e.target.value)
                  }
                  style={{
                    ...styles.input,
                    borderColor: errors.employeeName ? "red" : "#ccc",
                  }}
                />
              </td>
              <td style={styles.labelCell}>Date: 1/Jul/23</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: errors.date ? "red" : "#ccc",
                  }}
                />
              </td>
            </tr>

            {/* Mr./Ms. and Voucher No. Row */}
            <tr>
              <td style={styles.labelCell}>Mr./Ms.:</td>
              <td colSpan="2" style={styles.cell}></td>
              <td style={styles.labelCell}>Voucher No.:</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.voucherNo}
                  onChange={(e) =>
                    handleInputChange("voucherNo", e.target.value)
                  }
                  style={{
                    ...styles.input,
                    borderColor: errors.voucherNo ? "red" : "#ccc",
                  }}
                />
              </td>
            </tr>

            {/* Payment Date Row */}
            <tr>
              <td style={styles.labelCell}></td>
              <td colSpan="2" style={styles.cell}></td>
              <td style={styles.labelCell}>Payment Date:</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    handleInputChange("paymentDate", e.target.value)
                  }
                  style={{
                    ...styles.input,
                    borderColor: errors.paymentDate ? "red" : "#ccc",
                  }}
                />
              </td>
            </tr>

            {/* Project Name Row */}
            <tr>
              <td style={styles.labelCell}>Project Name:</td>
              <td colSpan="4" style={styles.cell}>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  style={{
                    ...styles.input,
                    borderColor: errors.projectName ? "red" : "#ccc",
                    width: "98%",
                  }}
                />
              </td>
            </tr>

            {/* EC Location Row */}
            <tr>
              <td style={styles.labelCell}>EC Location:</td>
              <td colSpan="4" style={styles.cell}>
                <input
                  type="text"
                  value={formData.ecLocation}
                  onChange={(e) =>
                    handleInputChange("ecLocation", e.target.value)
                  }
                  style={{ ...styles.input, width: "98%" }}
                />
              </td>
            </tr>

            {/* Table Header for Bills */}
            <tr>
              <th style={styles.headerCell}>Sr No.</th>
              <th style={styles.headerCell}>Bill No</th>
              <th style={styles.headerCell}>Vendor Name</th>
              <th style={styles.headerCell}>Description</th>
              <th style={styles.headerCell}>Amount</th>
            </tr>

            {/* Bill Rows */}
            {formData.bills.map((bill, i) => (
              <tr key={i}>
                <td style={styles.centerCell}>{i + 1}</td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.billNo}
                    onChange={(e) =>
                      handleBillChange(i, "billNo", e.target.value)
                    }
                    style={{
                      ...styles.input,
                      borderColor: errors[`billNo${i}`] ? "red" : "#ccc",
                    }}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.vendorName}
                    onChange={(e) =>
                      handleBillChange(i, "vendorName", e.target.value)
                    }
                    style={{
                      ...styles.input,
                      borderColor: errors[`vendorName${i}`] ? "red" : "#ccc",
                    }}
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
                    style={{
                      ...styles.input,
                      borderColor: errors[`amount${i}`] ? "red" : "#ccc",
                    }}
                  />
                </td>
              </tr>
            ))}

            {/* Total Rs. Row */}
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
                {formData.totalExpenses}
              </td>
            </tr>

            {/* Total Expenses Row */}
            <tr>
              <td colSpan="3" style={styles.cell}></td>
              <td style={{ ...styles.labelCell, textAlign: "right" }}>
                Total Expenses:
              </td>
              <td style={styles.cell}>{formData.totalExpenses}</td>
            </tr>

            {/* Advance Payment Row */}
            <tr>
              <td colSpan="3" style={styles.cell}></td>
              <td style={{ ...styles.labelCell, textAlign: "right" }}>
                Advance Payment:
              </td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.advancePayment}
                  onChange={(e) =>
                    handleInputChange("advancePayment", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>

            {/* Balance Reimbursement Row */}
            <tr>
              <td colSpan="3" style={styles.cell}></td>
              <td style={{ ...styles.labelCell, textAlign: "right" }}>
                Balance Reimbursement:
              </td>
              <td style={styles.cell}>{formData.balanceReimbursement}</td>
            </tr>

            {/* Amount in Words Row */}
            <tr>
              <td style={styles.labelCell}>Amt. in Words:</td>
              <td colSpan="4" style={styles.cell}>
                <input
                  type="text"
                  value={formData.amtInWords}
                  readOnly
                  style={{
                    ...styles.input,
                    width: "98%",
                    backgroundColor: "#f9f9f9",
                  }}
                />
              </td>
            </tr>

            {/* Signature Row */}
            <tr>
              <td style={{ ...styles.signCell, width: "25%" }}>
                <div style={styles.signLabel}>Prepared By - Name & Sign</div>
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) =>
                    handleInputChange("preparedBy", e.target.value)
                  }
                  style={{ ...styles.input, width: "95%", marginTop: "5px" }}
                />
              </td>
              <td style={{ ...styles.signCell, width: "25%" }}>
                <div style={styles.signLabel}>Receiver's Signature</div>
                <input
                  type="text"
                  value={formData.receiverSign}
                  onChange={(e) =>
                    handleInputChange("receiverSign", e.target.value)
                  }
                  style={{ ...styles.input, width: "95%", marginTop: "5px" }}
                />
              </td>
              <td style={{ ...styles.signCell, width: "25%" }}>
                <div style={styles.signLabel}>Accounts - Name & Sign</div>
                <input
                  type="text"
                  value={formData.accountsSign}
                  onChange={(e) =>
                    handleInputChange("accountsSign", e.target.value)
                  }
                  style={{ ...styles.input, width: "95%", marginTop: "5px" }}
                />
              </td>
              <td style={{ ...styles.signCell, width: "25%" }}>
                <div style={styles.signLabel}>Authorized Signatory</div>
                <input
                  type="text"
                  value={formData.authorizedSignatory}
                  onChange={(e) =>
                    handleInputChange("authorizedSignatory", e.target.value)
                  }
                  style={{ ...styles.input, width: "95%", marginTop: "5px" }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button style={styles.submitButton} onClick={handleSubmit}>
            Submit
          </button>
          <button
            style={styles.printButton}
            onClick={() => handlePrint({ ...formData, proofs })}
          >
            Print
          </button>
        </div>

        {proofs.length > 0 && (
          <div
            style={{
              marginTop: "15px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              fontSize: "10px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px" }}>
              Attached Proofs:
            </h4>
            {proofs.map((p, i) => {
              const path = typeof p === "string" ? p : p.path;
              const filename =
                typeof p === "string"
                  ? p.split("/").pop()
                  : p.filename || p.path.split("/").pop();
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <a
                    href={`http://localhost:5000${path}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#0066cc",
                      textDecoration: "none",
                      fontSize: "10px",
                    }}
                  >
                    📎 {filename}
                  </a>
                  {typeof p !== "string" &&
                    typeof p.billIndex !== "undefined" && (
                      <span style={{ fontSize: 11, color: "#666" }}>
                        {" "}
                        (Bill {p.billIndex + 1})
                      </span>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: "10px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f0f0f0",
    minHeight: "100vh",
    maxWidth: "210mm",
    margin: "0 auto",
  },
  formBackground: {
    background: "#fff",
    padding: "15px",
    margin: "0 auto",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    pageBreakInside: "avoid",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10px",
    border: "2px solid #000",
    tableLayout: "fixed",
  },
  header: {
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "5px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #000",
  },
  subHeader: {
    fontSize: "8px",
    textAlign: "center",
    padding: "4px",
    lineHeight: "1.3",
    border: "1px solid #000",
  },
  title: {
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center",
    padding: "4px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #000",
  },
  cell: {
    border: "1px solid #000",
    padding: "2px 4px",
    minHeight: "20px",
    fontSize: "10px",
  },
  labelCell: {
    border: "1px solid #000",
    padding: "2px 4px",
    fontWeight: "500",
    backgroundColor: "#f9f9f9",
    fontSize: "9px",
    whiteSpace: "nowrap",
  },
  headerCell: {
    border: "1px solid #000",
    padding: "4px",
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#e9e9e9",
    fontSize: "9px",
  },
  centerCell: {
    border: "1px solid #000",
    padding: "2px",
    textAlign: "center",
    fontSize: "9px",
  },
  signCell: {
    border: "1px solid #000",
    padding: "6px",
    height: "60px",
    verticalAlign: "top",
    fontSize: "8px",
  },
  signLabel: {
    fontSize: "8px",
    fontWeight: "500",
    marginBottom: "3px",
  },
  input: {
    width: "98%",
    border: "1px solid #ccc",
    padding: "2px 3px",
    fontSize: "9px",
    outline: "none",
    boxSizing: "border-box",
  },
  submitButton: {
    padding: "8px 24px",
    fontSize: "13px",
    cursor: "pointer",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  printButton: {
    padding: "8px 20px",
    fontSize: "13px",
    cursor: "pointer",
    backgroundColor: "#1976D2",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    marginLeft: "10px",
  },
};

export default CashPaymentForm;
