// src/pages/vouchers/OutstationTravelForm.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import OCRUpload from "../../components/OCRUpload";

// ---------------- Number to Words ----------------
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
      " Hundred " +
      (num % 100 ? numberToWords(num % 100) : "")
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
  const cleaned = String(s).replace(/[^0-9.,-]/g, "");
  // Allow comma-separated multiple values like "100,200,50"
  const parts = cleaned
    .split(",")
    .map((p) => parseFloat(p))
    .filter((n) => !isNaN(n));
  return parts.reduce((sum, n) => sum + n, 0);
};

// No OCR modal — only file upload for proofs

// ---------------- OutstationTravelForm ----------------
const OutstationTravelForm = ({ loggedInUser }) => {
  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const generateVoucherNo = () =>
    "OTV-" + Math.floor(1000 + Math.random() * 9000);

  const initialData = {
    employeeName: loggedInUser?.name || "",
    dateFrom: todayDate,
    dateTo: todayDate,
    dateOfSubmission: todayDate,
    travelDescription: "",
    projectName: "",
    ecLocation: "Pune",
    bills: Array(10)
      .fill()
      .map(() => ({
        dateOfTravel: "",
        description: "",
        transport: 0,
        hotel: 0,
        meals: 0,
        phone: 0,
        misc: 0,
        total: 0,
        proof: "",
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
  const [proofs, setProofs] = useState([]);

  // ✅ Auto calculate totals
  useEffect(() => {
    const total = formData.bills.reduce(
      (sum, b) => sum + parseAmountValue(b.total),
      0
    );
    setFormData((prev) => ({
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

  const handleInputChange = (field, value) =>
    setFormData({ ...formData, [field]: value });

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

    newBills[index].total =
      transportVal + hotelVal + mealsVal + phoneVal + miscVal;
    setFormData({ ...formData, bills: newBills });
  };

  // File upload (proof) — upload to server and keep returned path in `proofs`
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataFile = new FormData();
    formDataFile.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload",
        formDataFile,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      const filePath = res.data.filePath;
      setProofs((prev) => [...prev, filePath]);
    } catch (err) {
      console.error("Upload Error:", err);
      alert("File upload failed");
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Not logged in");

      // include proofs in payload
      const payload = {
        ...formData,
        proofs,
      };

      const res = await axios.post(
        "http://localhost:5000/api/outstation-travel",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 200 || res.status === 201) {
        alert("Outstation Travel Voucher Submitted!");
        setFormData(initialData);
        setProofs([]);
      } else {
        alert("Submission failed");
      }
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message || err);
      alert(
        "Error submitting data: " +
          (err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            "Server error")
      );
    }
  };

  const printRef = useRef(null);

  const handlePrint = (data) => {
    try {
      const node = printRef.current;
      if (!node) return alert("Print area not found");
      const clone = node.cloneNode(true);

      // replace inputs/selects/textareas in clone with plain text nodes so values wrap
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
          const div = document.createElement("div");
          div.textContent = text;
          div.style.whiteSpace = "normal";
          div.style.display = "block";
          div.style.wordWrap = "break-word";
          div.style.overflowWrap = "anywhere";
          div.style.fontFamily = "inherit";
          if (c.parentNode) c.parentNode.replaceChild(div, c);
        }
      } catch (err) {
        console.warn("replace fields for print failed", err);
      }

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

      // Remove upload widgets and interactive controls from the clone so they don't print
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

        // remove small upload heading/text nodes like 'Upload Bill:'
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
        console.warn("failed to remove UI nodes before print", err);
      }

      // Force proofs section to start on a new page
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
        console.warn("mark proofs failed", err);
      }
      const wrapper = document.createElement("div");
      wrapper.appendChild(clone);
      const printStyles = `
        <style>
          html,body{font-family: Arial, Helvetica, sans-serif; padding:10px}
          table{width:100%; border-collapse:collapse; table-layout:fixed}
          th,td{word-wrap:break-word; overflow-wrap:anywhere; white-space:normal}
          input,textarea{white-space:normal; word-wrap:break-word; overflow-wrap:anywhere}
          img{max-width:100%; height:auto}
            th, td { padding: 4px !important; height: auto !important; }
            td, th { line-height: 1.15 !important; }
            .signCell { height: auto !important; min-height: 0 !important; }
            input, textarea { border: none !important; }
            @media print {
              input[type="file"], .uploadButton, .uploadSection, .uploadLabel, .uploadInfo, .submitSection, button { display: none !important; }
            }
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
      console.error("Print error", err);
      alert("Unable to print");
    }
  };

  return (
    <div style={styles.page} ref={printRef}>
      <div style={styles.formBackground}>
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e3f2fd",
            borderRadius: "5px",
            border: "1px solid #2196f3",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>
            📤 Upload Bill
          </h4>
          <OCRUpload
            onOCRComplete={(mappedData) => {
              // Find first empty row or use the first row
              const emptyIndex =
                formData.bills.findIndex(
                  (b) =>
                    !b.transport && !b.hotel && !b.meals && !b.phone && !b.misc
                ) || 0;

              // mapOCRDataToForm returns normalized keys: billNumber, vendorName, amount, date, description
              // For outstation travel, we typically map the amount to hotel costs but can also include vendor name
              handleBillChange(emptyIndex, "hotel", mappedData.amount || 0);
              handleBillChange(
                emptyIndex,
                "description",
                mappedData.vendorName || "Travel Expense"
              );

              // attach proof if returned (store as string path)
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

              // Optionally store date and gst if the form supports it
              // handleBillChange(emptyIndex, "date", mappedData.date || "");
              // handleBillChange(emptyIndex, "gstNumber", mappedData.gstNumber || "");
            }}
            formType="outstation"
          />
        </div>
        {/* no OCR modal */}

        {/* ---------------- Table Layout ---------------- */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th colSpan="8" style={styles.header}>
                SAMARTH UDYOG TECHNOLOGY FORUM
              </th>
            </tr>
            <tr>
              <td colSpan="8" style={styles.subHeader}>
                CIN: U74999PN2017NPL172629
                <br />
                Registered Office: Ground Floor, SPPU Research Park Foundation,
                <br />
                Savitribai Phule Pune University, Ganeshkhind, Pune - 411 007
              </td>
            </tr>
            <tr>
              <th colSpan="8" style={styles.title}>
                Outstation Travel Expenses Voucher
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.cell}>Employee Name:</td>
              <td colSpan="2" style={styles.cell}>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) =>
                    handleInputChange("employeeName", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>From:</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.dateFrom}
                  onChange={(e) =>
                    handleInputChange("dateFrom", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>To:</td>
              <td colSpan="2" style={styles.cell}>
                <input
                  type="text"
                  value={formData.dateTo}
                  onChange={(e) => handleInputChange("dateTo", e.target.value)}
                  style={styles.input}
                />
              </td>
            </tr>
            <tr>
              <td style={styles.cell}>Date of Submission:</td>
              <td colSpan="3" style={styles.cell}>
                <input
                  type="text"
                  value={formData.dateOfSubmission}
                  onChange={(e) =>
                    handleInputChange("dateOfSubmission", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>Travel Description:</td>
              <td colSpan="3" style={styles.cell}>
                <input
                  type="text"
                  value={formData.travelDescription}
                  onChange={(e) =>
                    handleInputChange("travelDescription", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>
            <tr>
              <td style={styles.cell}>Project Name:</td>
              <td colSpan="7" style={styles.cell}>
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
            <tr>
              <td style={styles.cell}>EC Location:</td>
              <td colSpan="7" style={styles.cell}>
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
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.dateOfTravel}
                    onChange={(e) =>
                      handleBillChange(i, "dateOfTravel", e.target.value)
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
                    value={bill.transport}
                    onChange={(e) =>
                      handleBillChange(i, "transport", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.hotel}
                    onChange={(e) =>
                      handleBillChange(i, "hotel", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.meals}
                    onChange={(e) =>
                      handleBillChange(i, "meals", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.phone}
                    onChange={(e) =>
                      handleBillChange(i, "phone", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>
                  <input
                    type="text"
                    value={bill.misc}
                    onChange={(e) =>
                      handleBillChange(i, "misc", e.target.value)
                    }
                    style={styles.input}
                  />
                </td>
                <td style={styles.cell}>{bill.total}</td>
              </tr>
            ))}

            {/* Totals */}
            <tr>
              <td colSpan="7" style={{ ...styles.cell, textAlign: "right" }}>
                Total Expenses
              </td>
              <td style={styles.cell}>{formData.totalExpenses}</td>
            </tr>
            <tr>
              <td colSpan="8" style={styles.cell}>
                Total in Words: {formData.amtInWords}
              </td>
            </tr>
            <tr>
              <td colSpan="8" style={styles.cell}>
                Total Expenses: {formData.totalExpenses} <br />
                Advance Payment:{" "}
                <input
                  type="text"
                  value={formData.advancePayment}
                  onChange={(e) =>
                    handleInputChange("advancePayment", e.target.value)
                  }
                  style={styles.input}
                />
                <br />
                Balance Reimbursement: {formData.balanceReimbursement}
              </td>
            </tr>
            <tr>
              <td style={styles.cell}>Payment Date:</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    handleInputChange("paymentDate", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>Voucher No.:</td>
              <td colSpan="5" style={styles.cell}>
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
            <tr>
              <td style={styles.cell}>Prepared By</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) =>
                    handleInputChange("preparedBy", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>Receiver's Signature</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.receiverSign}
                  onChange={(e) =>
                    handleInputChange("receiverSign", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td style={styles.cell}>Accounts</td>
              <td style={styles.cell}>
                <input
                  type="text"
                  value={formData.accountsSign}
                  onChange={(e) =>
                    handleInputChange("accountsSign", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
              <td colSpan="2" style={styles.cell}>
                Authorized Signatory
                <br />
                <input
                  type="text"
                  value={formData.authorizedSignatory}
                  onChange={(e) =>
                    handleInputChange("authorizedSignatory", e.target.value)
                  }
                  style={styles.input}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
            onClick={handleSubmit}
          >
            Submit
          </button>
          <button
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: "#1976D2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              marginLeft: 10,
            }}
            onClick={() => handlePrint({ ...formData, proofs })}
          >
            Print
          </button>
        </div>

        {/* Proof Display Section */}
        {proofs.length > 0 && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h4
              style={{
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              📎 Attached Proof Documents:
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {proofs.map((proof, index) => {
                const path = typeof proof === "string" ? proof : proof.path;
                const filename =
                  typeof proof === "string"
                    ? proof.split("/").pop()
                    : proof.filename || proof.path.split("/").pop();
                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px",
                      backgroundColor: "#fff",
                      borderRadius: "4px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        fontWeight: "500",
                      }}
                    >
                      📄 Proof {index + 1}:
                    </span>
                    <a
                      href={`http://localhost:5000${path}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#0066cc",
                        textDecoration: "underline",
                        fontWeight: "500",
                      }}
                    >
                      View Document
                    </a>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        marginLeft: "auto",
                      }}
                    >
                      {filename}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { padding: "20px", fontFamily: "Arial, sans-serif" },
  formBackground: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "20px" },
  header: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "18px",
    padding: "8px",
    border: "1px solid #000",
  },
  subHeader: {
    textAlign: "center",
    fontSize: "12px",
    padding: "6px",
    border: "1px solid #000",
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "16px",
    padding: "6px",
    border: "1px solid #000",
  },
  cell: {
    border: "1px solid #000",
    padding: "6px",
    fontSize: "12px",
    textAlign: "center",
  },
  input: { width: "95%", fontSize: "12px", padding: "2px" },
};

export default OutstationTravelForm;
