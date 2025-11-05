// Shared styles for all forms - based on admin styling
export const sharedStyles = {
  page: { 
    padding: "20px", 
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh"
  },
  formBackground: { 
    background: "#fff", 
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    marginBottom: "20px"
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse", 
    fontSize: "12px",
    backgroundColor: "#fff",
    borderRadius: "6px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  header: { 
    fontSize: "16px", 
    fontWeight: "bold", 
    textAlign: "center", 
    padding: "8px",
    backgroundColor: "#2c3e50",
    color: "#fff"
  },
  subHeader: { 
    fontSize: "10px", 
    textAlign: "center", 
    padding: "6px",
    backgroundColor: "#34495e",
    color: "#ecf0f1"
  },
  title: { 
    fontSize: "14px", 
    fontWeight: "bold", 
    textAlign: "center", 
    padding: "8px",
    backgroundColor: "#3498db",
    color: "#fff"
  },
  cell: { 
    border: "1px solid #ddd", 
    padding: "6px",
    backgroundColor: "#fff"
  },
  input: { 
    width: "95%", 
    border: "1px solid #ddd", 
    padding: "6px", 
    fontSize: "12px",
    borderRadius: "4px",
    transition: "border-color 0.3s ease",
    outline: "none"
  },
  textarea: {
    width: "95%",
    border: "1px solid #ddd",
    padding: "6px",
    fontSize: "12px",
    borderRadius: "4px",
    resize: "vertical",
    minHeight: "60px",
    fontFamily: "Arial, sans-serif"
  },
  button: {
    padding: "8px 16px",
    fontSize: "14px",
    cursor: "pointer",
    backgroundColor: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.3s ease",
    fontWeight: "500"
  },
  buttonHover: {
    backgroundColor: "#2980b9"
  },
  buttonSuccess: {
    backgroundColor: "#27ae60"
  },
  buttonDanger: {
    backgroundColor: "#e74c3c"
  },
  buttonWarning: {
    backgroundColor: "#f39c12"
  },
  errorInput: {
    borderColor: "#e74c3c",
    backgroundColor: "#fdf2f2"
  },
  successMessage: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    border: "1px solid #c3e6cb"
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    border: "1px solid #f5c6cb"
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "500",
    textTransform: "uppercase"
  },
  statusPending: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    border: "1px solid #ffeaa7"
  },
  statusApproved: {
    backgroundColor: "#d4edda",
    color: "#155724",
    border: "1px solid #c3e6cb"
  },
  statusRejected: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    border: "1px solid #f5c6cb"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modal: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "400px",
    maxWidth: "90vw",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
  },
  formSection: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    border: "1px solid #e9ecef"
  },
  formTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#2c3e50",
    borderBottom: "2px solid #3498db",
    paddingBottom: "5px"
  },
  formRow: {
    display: "flex",
    gap: "15px",
    marginBottom: "15px",
    alignItems: "center"
  },
  formGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  formLabel: {
    fontSize: "12px",
    fontWeight: "500",
    marginBottom: "5px",
    color: "#555"
  },
  required: {
    color: "#e74c3c"
  },
  uploadArea: {
    border: "2px dashed #ddd",
    borderRadius: "6px",
    padding: "20px",
    textAlign: "center",
    backgroundColor: "#fafafa",
    cursor: "pointer",
    transition: "border-color 0.3s ease"
  },
  uploadAreaHover: {
    borderColor: "#3498db",
    backgroundColor: "#f0f8ff"
  }
};

// Modal styles
export const modalStyles = {
  overlay: sharedStyles.modalOverlay,
  modal: sharedStyles.modal,
  button: sharedStyles.button
};
