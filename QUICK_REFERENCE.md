# 🚀 QUICK REFERENCE CARD

## Start the System (Choose One)

### 🪟 Windows Users

```
Double-click: START_SERVICES.bat
```

### 💻 Manual Start (PowerShell)

```powershell
# Terminal 1: Backend
cd "C:\Users\admin\Reimbursement System\reimbursement-portal-server"
node server.js

# Terminal 2: Frontend
cd "C:\Users\admin\Reimbursement System\reimbursement-portal-client"
npm start
```

---

## Access the System

| Component | URL                   | Login            |
| --------- | --------------------- | ---------------- |
| Frontend  | http://localhost:3000 | Email + Password |
| Backend   | http://localhost:5000 | API calls        |

---

## Complete OCR Workflow (60 seconds)

```
1. Login → http://localhost:3000
   └─ Email: your@email.com
   └─ Password: your_password

2. Click "Cash Payment" (or other form)

3. Click [📷 Scan Receipt]
   └─ Select a bill image (JPG/PNG)
   └─ Wait 5-10 seconds

4. Modal appears with:
   ✓ Bill Number
   ✓ Vendor Name
   ✓ Amount
   ✓ Date
   └─ Edit if needed

5. Click [✅ Confirm & Add]
   └─ Form auto-fills
   └─ Proof image linked

6. Fill remaining fields

7. Click [📤 Submit & Print]
   └─ Form saved
   └─ Print window opens
   └─ Bill image on next page

8. Print to PDF or printer
```

---

## Form Types

| Form                  | For             | Auto-Fills                  |
| --------------------- | --------------- | --------------------------- |
| **Cash Payment**      | Cash expenses   | Vendor, Amount, Date        |
| **Vendor Payment**    | Vendor invoices | Vendor, Amount, Date, GST   |
| **Local Travel**      | Local trips     | Vendor (from), Amount, Date |
| **Outstation Travel** | Hotel/trips     | Vendor, Amount, Date        |

---

## What Gets Extracted from Bill

✅ **Always Works:**

- Vendor/Shop Name
- Bill/Invoice Number
- Date
- Total Amount

✅ **Often Works:**

- GST/Tax Number
- Items list
- Address

❌ **May Not Work:**

- Handwritten fields
- Very poor quality images
- Non-English text

---

## File Locations

| What           | Where                          |
| -------------- | ------------------------------ |
| Backend        | `reimbursement-portal-server/` |
| Frontend       | `reimbursement-portal-client/` |
| Uploaded Bills | `uploadFiles/`                 |
| Database       | MySQL (configured in .env)     |

---

## Troubleshooting Quick Links

| Problem           | Solution                                 |
| ----------------- | ---------------------------------------- |
| 404 Error         | Backend not running? `node server.js`    |
| Upload fails      | File > 5MB? Image format?                |
| OCR no data       | Image unclear? Bill has all fields?      |
| Print no images   | Proof link shown? Browser allows popups? |
| Form won't submit | Fill ALL required fields (\*)            |

---

## API Endpoints (For Testing)

```bash
# Test backend is running
curl http://localhost:5000

# Upload a bill
curl -X POST http://localhost:5000/api/uploads/cashPayments \
  -F "file=@bill.jpg"

# Test OCR
curl -X POST http://localhost:5000/api/ocr/parse \
  -H "Content-Type: application/json" \
  -d '{"filePath":"/uploadFiles/CashPaymentForm/test.jpg"}'
```

---

## Database Check

```powershell
# Connect to MySQL
mysql -u root -p

# List databases
SHOW DATABASES;

# Select reimbursement database
USE reimbursement;

# List tables
SHOW TABLES;

# View cash payments
SELECT * FROM CashPayments;
```

---

## Browser Console Help (F12 Key)

```javascript
// In browser console, check:
// 1. No red errors?
// 2. Network tab shows 200 responses?
// 3. Application > LocalStorage > token exists?

// View stored token
localStorage.getItem("token");

// View stored user
localStorage.getItem("user");
```

---

## Common Error Messages & Fixes

| Error                            | Fix                                   |
| -------------------------------- | ------------------------------------- |
| "Cannot reach OCR service (404)" | Start backend: `node server.js`       |
| "No file uploaded"               | Select image first, file < 5MB        |
| "Failed to extract data"         | Image unclear? Try different bill     |
| "Form validation failed"         | Fill ALL required fields (\*)         |
| "CORS error"                     | Backend CORS enabled? Check server.js |
| "Unauthorized (401)"             | Re-login? Token expired?              |

---

## Test Data

Can create test data with:

```powershell
cd reimbursement-portal-server
node scripts/seed-test-data.js
```

This creates:

- Sample users
- Sample forms
- Sample approvals

---

## Performance Tips

1. **Keep file sizes small** (< 5MB per bill)
2. **Use clear bill images** (well-lit, not blurry)
3. **Clear browser cache** if UI looks odd (Ctrl+Shift+Del)
4. **Use Chrome/Edge** (best browser support)
5. **Don't upload 100 bills at once** (do in batches)

---

## Daily Workflow

### Morning

- [ ] Open 2 terminals
- [ ] Run START_SERVICES.bat
- [ ] Login: http://localhost:3000

### Throughout Day

- [ ] Scan bills as received
- [ ] Submit forms
- [ ] Print copies for records

### End of Day

- [ ] Review submitted forms
- [ ] Export reports
- [ ] Close terminals

---

## Emergency Stop

```powershell
# Kill backend
taskkill /F /IM node.exe

# Kill all node processes
taskkill /F /IM node.exe /T
```

Or close the terminal windows directly.

---

## Get Help

1. Check **EMPLOYEE_DASHBOARD_VERIFICATION.md** for complete details
2. Check **SETUP_AND_USAGE_GUIDE.md** for detailed guide
3. Check browser console (F12 > Console) for error messages
4. Check backend terminal for server errors

---

## Success Indicators ✅

You'll know it's working when:

- ✅ Backend shows: `🚀 Server running on port 5000`
- ✅ Frontend shows: `Compiled successfully!`
- ✅ Can login: `http://localhost:3000`
- ✅ Can upload bill: `Scan Receipt` button works
- ✅ OCR extracts: Modal shows vendor, amount, date
- ✅ Form fills: Fields auto-populate
- ✅ Print works: Bill image appears on next page
- ✅ Submit works: Form saved in database

---

**Version:** 1.0  
**Last Updated:** 2025-11-12  
**Status:** ✅ PRODUCTION READY

For complete details, see the comprehensive guides in this folder.
