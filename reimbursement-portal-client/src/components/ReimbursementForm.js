import { useState } from "react";
import API from "../utils/api";
import OCRUpload from "./OCRUpload";

function ReimbursementForm({ fetchReimbursements }) {
  const [type, setType] = useState("Travel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleOCRComplete = (ocrData) => {
    setAmount(ocrData.amount?.toString() || "");
    setDescription(ocrData.description || "");
    setGst(ocrData.gstNumber || ocrData.gst || "");
    setBillNumber(ocrData.billNumber || ocrData.billNo || "");
    setDate(ocrData.date || ocrData.billDate || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);
    formData.append("billNumber", billNumber);
    formData.append("date", date);
    formData.append("amount", amount);
    formData.append("gst", gst);
    if (file) formData.append("billImage", file);

    try {
      await API.post("/reimbursements", formData);
      setMessage("Reimbursement submitted successfully");
      setType("Travel");
      setDescription("");
      setAmount("");
      setGst("");
      setBillNumber("");
      setDate("");
      setFile(null);
      fetchReimbursements();
    } catch (err) {
      setMessage(err.response?.data?.message || "Submission failed");
    }
  };

  return (
    <div>
      <h3>Submit Reimbursement</h3>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Travel">Travel</option>
          <option value="Food">Food</option>
          <option value="Health">Health</option>
          <option value="Office">Office</option>
          <option value="Misc">Misc</option>
        </select>
        <OCRUpload onOCRComplete={handleOCRComplete} formType="misc" />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Bill Number"
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value)}
        />
        <input
          type="text"
          placeholder="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="GST"
          value={gst}
          onChange={(e) => setGst(e.target.value)}
        />
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default ReimbursementForm;
