import { useState } from "react";
import API from "../utils/api";
import Tesseract from "tesseract.js";

function ReimbursementForm({ fetchReimbursements }) {
  const [type, setType] = useState("Travel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleOCR = async (file) => {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => console.log(m),
    });
    const text = result.data.text;
    // Extract amount, gst, description from OCR text
    const amountMatch = text.match(/[\d,.]+/);
    setAmount(amountMatch ? amountMatch[0] : "");
    setDescription(text.substring(0, 50));
    setGst("18"); // example, you can improve parsing
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    handleOCR(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);
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
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
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
