# VOLT — Veruela Online Livestock Trade

A web-based livestock marketplace for Veruela, Agusan del Sur. It connects verified farmers with buyers, and lets the Municipal Agriculture Office (MAO) verify farmers and their livestock documents and monitor trading in the municipality.

- **Frontend:** React (Create React App), React Router, Leaflet maps
- **Backend:** Node.js + Express 5, MySQL / MariaDB (`mysql2`), JWT authentication
- **Uploads:** local disk by default, or any S3-compatible storage

---

## Roles

| Role | What they do |
|---|---|
| **Farmer** | Gets their account verified, posts livestock and farm products, negotiates deals in the chat, records the weight at pickup |
| **Buyer** | Browses the marketplace and map, inquires, makes offers, confirms deals |
| **MAO Staff** | Verifies farmer accounts and listing documents, monitors transactions, views reports and the map |
| **Super Admin** | Everything MAO staff can do, plus managing user and staff accounts and system settings |

## Features

### Trading pipeline

```
Listing ─► Inquiry ─► Negotiation ─► Confirmation ─► Completed
(MAO-approved)  (chat)   (Deal Terms)   (weighing)
```

1. **Listing.** A verified farmer posts livestock with a barangay health certificate. MAO reviews it before it appears in the marketplace. Live animals are priced **per head** or **per kg of live weight**; they're always counted by head, and the weight is the average kg per head, so buyers see an estimate per head.
2. **Inquiry.** The buyer asks about the listing in the chat.
3. **Negotiation.** The buyer starts a deal (Buy Now or "Proceed to Negotiation"). The **Deal Terms** bar above the chat lets either side offer a price, a pickup date and place, and a payment method; the other side accepts or counters. Every offer is also posted in the chat as a record.
4. **Confirmation.** Accepting moves the deal here. For per-kg deals, the seller **records the actual weight at pickup**, which sets the final amount.
5. **Completed.** The buyer confirms receipt.

Other rules:
- Stock is reserved when a deal starts and returned if it's declined or cancelled.
- Buyers can cancel freely within the first hour; after that they request cancellation and the seller approves it (auto-approved after 48 hours).
- While a listing has an open deal, its type, selling unit, price and weight can't be changed.

### MAO verification and monitoring
- **Farmer account verification:** farmers submit a valid government ID and a barangay certificate. MAO staff approve or reject them from the Document Verification page; rejecting requires a reason the farmer sees. Who reviewed each one, and when, is recorded.
- **Listing document verification:** MAO approves or rejects each listing's barangay health certificate, with a required reason. A rejected listing goes back for review when the farmer edits it.
- **Private documents:** government IDs and barangay certificates are stored outside the public uploads folder and opened only through links that expire after 2 hours.
- **Monitoring:** all transactions (read-only), including the agreed terms and weights, plus a map of farms and listings.

### Reports
- Trading summaries per product type and month, verification summary, and trade value trend
- **Farmers by Barangay:** farmer counts for each of Veruela's 20 barangays, filterable by barangay, purok and verification, with a farmer list and CSV export
- CSV export and print

### Other
- Barangay and purok picked from dropdowns on the farmer profile, plus a map pin for the farm
- Sign-up with an emailed code or Google, password reset, and a "Log out?" confirmation
- Staff login/logout history
- Live buyer location and trip distance to the seller
- Offline / connection-restored notice
- Phone layouts for every role

---

## Project structure

```
backend/
  server.js             Express app; also serves the built frontend in production
  controllers/  routes/  middleware/  utils/
  migrations/           SQL files, applied by hand in order (no migration runner)
  scripts/              one-off maintenance scripts
  createAdmin.js        seeds the first Super Admin account
  uploads/              public uploads (photos, listing documents) — not committed
  uploads-private/      verification documents — not committed
frontend/
  src/pages/  src/components/  src/utils/
  src/setupProxy.js     dev-server proxy for /uploads and /private-files
package.json            root build: builds the frontend into backend/frontend-build
```

---

## Setup (local development)

### Requirements
- Node.js 20 or newer
- MySQL 8 or MariaDB 10.4+ (e.g. through XAMPP)

### 1. Database

Create the database, then apply the schema and migrations **in order**:

```bash
mysql -u root -p -e "CREATE DATABASE herdmarket_db"
cd backend/migrations

# 1) The base schema. It already includes migrations 0001–0007.
mysql -u root -p herdmarket_db < 0000_initial_schema.sql

# 2) Every migration from 0008 to the newest, one at a time, in number order:
mysql -u root -p herdmarket_db < 0008_listing_draft_status.sql
mysql -u root -p herdmarket_db < 0009_farmer_notification_reads.sql
# ... and so on through the last file in the folder
```

Do **not** run 0001–0007 on a database created from `0000_initial_schema.sql`; they're already in it and will fail with "Duplicate column".

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill it in (see below)
node createAdmin.js       # creates the first Super Admin and prints the password
npm run dev               # http://localhost:5000
```

At minimum, set these in `backend/.env`:

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Database connection |
| `JWT_SECRET` | A long random string; signs logins and private document links |
| `GOOGLE_CLIENT_ID` | Google sign-in (optional) |
| `EMAIL_*` | SMTP for sign-up codes and password reset. If `EMAIL_HOST` is blank, emails are printed to the server console instead |

Everything else is explained in `backend/.env.example`.

MAO staff accounts are created by the Super Admin from **Admin → Staff**.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # optional: REACT_APP_GOOGLE_CLIENT_ID
npm start                 # http://localhost:3000
```

In development, API and upload requests are forwarded to the backend on port 5000 (`proxy` in `package.json` and `src/setupProxy.js`). Restart `npm start` after changing `setupProxy.js`.

### Tests

```bash
cd frontend
npm test
```

---

## Production

The backend serves the built frontend, so the whole site runs as one Node.js app:

```bash
npm run build     # from the project root: builds frontend/ into backend/frontend-build
npm start         # starts backend/server.js
```

For production, set `CORS_ORIGIN`, `FRONTEND_URL` and `TRUST_PROXY` in `backend/.env` (see `.env.example`). Local-disk uploads don't survive a redeploy on most hosts, so set the `S3_*` variables to use object storage.

## Upgrading an existing database

When you pull changes that add files to `backend/migrations/`, apply each new file in number order. Until you do, the pages that use the new columns fail with "server error".

After upgrading past migration 0028, move verification documents uploaded before then into the private folder (once per server; safe to repeat; not needed with S3):

```bash
cd backend
node scripts/makeVerificationDocsPrivate.js
```

Then restart the backend.
