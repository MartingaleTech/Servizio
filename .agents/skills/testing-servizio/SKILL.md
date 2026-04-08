# Testing Servizio MVP

## Environment Setup

### Backend
```bash
cd backend
poetry install
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000
```
- Backend runs on http://localhost:8000
- SQLite database at `backend/servizio.db`
- Delete the DB file and restart to get a fresh database with seeded admin
- Admin credentials are seeded by the backend on first start (see `backend/app/main.py` seed_admin function)

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```
- Frontend runs on http://localhost:5173

## Devin Secrets Needed
- None required for local testing (all credentials are seeded locally)

## Known Issues

### passlib/bcrypt Compatibility
- passlib 1.7.4 may be incompatible with bcrypt 5.0.0+
- If backend crashes on startup with `ValueError: password cannot be longer than 72 bytes`, replace passlib with direct bcrypt usage in `backend/app/core/security.py`

### React Controlled Inputs
- The browser tool's `type` action does NOT properly trigger React's synthetic onChange events for controlled inputs
- **Workaround**: Use the browser tool's `console` action with React fiber internals:
```javascript
// Find React's internal props key and call onChange directly
const inputs = document.querySelectorAll('input');
for (const inp of inputs) {
  const key = Object.keys(inp).find(k => k.startsWith('__reactProps$'));
  if (key && inp[key].onChange) {
    inp[key].onChange({ target: { value: 'desired value' } });
  }
}
```
- This approach works for text, email, password, datetime-local, and number inputs
- For button clicks that get blocked, use: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Button Text')).click()`

### Playwright CDP Conflict
- Do NOT use Playwright via CDP (`connect_over_cdp`) while also using the browser tool - they compete for control and Playwright scripts will hang
- Choose one approach: either drive the entire demo via Playwright OR via the browser tool, not both simultaneously

## Test Data Setup
Create test data via API calls before recording demos. Use the `/api/auth/signup` endpoint with role=customer or role=worker. See backend API docs at http://localhost:8000/docs for all available endpoints.

## Test Flows

### Customer Flow
1. Login -> Customer dashboard (greeting, event stats, New Event button)
2. Events list -> Event detail (quote breakdown, Confirm & Pay)
3. Bookings page (booking list with status)
4. Profile page (name, email, phone, role)

### Worker Flow
1. Login -> Worker dashboard (verification warning if not verified)
2. Profile page with tabs: Profile (roles, experience), Verify (ID upload), Availability (day/time)
3. Shifts page (filter tabs: upcoming/active/completed/all)
4. Earnings page (total earned, pending, payout history)

### Admin Flow
1. Login -> Admin dashboard (user count, event count, bookings, revenue)
2. Verifications page (approve/reject with notes)
3. Users page (filter by role, deactivate)
4. Events page (filter by status)
5. Pricing page (hourly rates and platform fee per role)

### Role-Based Access Control
- Customer accessing /admin/* -> redirected to /customer/dashboard
- Worker accessing /customer/* -> redirected to /worker/dashboard
- Unauthenticated -> redirected to /login
