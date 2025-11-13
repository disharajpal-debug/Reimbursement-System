Admin Dashboard notes

- Purpose: Admin dashboard aggregates requests across forms and provides admin actions.

Endpoints used (client-side via `src/utils/api.js`):

- GET /admin/dashboard -> returns { success: true, data: { stats, users, requests, lastUpdated } }
- GET /users/me -> returns current user object or { success, data }
- GET /admin/transactions -> returns array or { success, data }
- PATCH /admin/transactions/:id -> update transactionDate
- GET /admin/approved-requests -> returns array of approved requests
- GET /admin/users -> returns array of users
- POST /admin/users -> create user
- PUT /admin/users/:id -> update user
- DELETE /admin/users/:id -> delete user

Data shapes (common fields):

- Request object: { id|\_id, formType, \_formTypeLabel, amount, status, createdAt, user, employeeName, proofs/bills/expenses }
- User object: { id, name, email, role, managerId }
- Dashboard response: data.requests contains keys by form type: reimbursements, cashPayments, localTravel, outstationTravel, vendorPayments, vouchers

Notes:

- The client uses `src/utils/api.js` which auto-attaches the JWT token from localStorage.
- When embedding `EmployeeHome` into `AdminDashboard` (admin view), `EmployeeHome` will not render its own SidePanel and will respect the parent's `selectedForm` state.
- If you see empty lists, check backend (server must be running on port 5000) and that the logged-in admin's token is present in localStorage.

If you want, I can add a small Jest smoke test that renders `AdminDashboard` with mocked API responses.
