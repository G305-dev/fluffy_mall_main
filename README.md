# Fluffy'n'Yummy Mall — Online Store (MVP)

Production-ready 3-day MVP for **Fluffy'n'Yummy Mall** (`@fluffy_nyummy_mall`), Anthony Village, Lagos.

Live loop: **browse → cart → guest checkout → Paystack or bank transfer → WhatsApp → admin fulfilment**.

## Stack

- Next.js 14 (App Router) + Tailwind CSS
- File-backed catalog & orders (`data/*.json`) — swap for Supabase/Postgres when keys are available
- Paystack-ready webhook (`/api/paystack/webhook`) with HMAC signature check
- Vercel-ready (`npm run build`)

## Local / preview

```bash
cd fluffy-mall
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

## Admin

## Admin

- URL: `/admin`
- Configure the admin password with the `ADMIN_PASSWORD` environment variable.
- Never store the admin password in this README or commit it to GitHub.
- Verify bank transfers, update order status, edit prices/stock, and change delivery rules.

## Customer sign-in

- Customers can sign in with email and password, create an account, or use Google.
- Set `CUSTOMER_SESSION_SECRET` to a long random value in production.
- Google sign-in requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL`.
- Add this Google OAuth redirect URI: `${NEXT_PUBLIC_APP_URL}/api/customer/google/callback`.
- Payment success and failure emails require `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`.


## Business rules (locked from the guide)

- Free delivery: **₦70,000 Lagos** / **₦150,000 outside Lagos**
- Standard fees (editable in admin): Lagos **₦3,500** · outside **₦7,500**
- In-store pickup at **30A Oseni Street, Anthony Village** with **5%** discount (2%–5% range)
- Paystack (card / transfer / USSD) + company accounts:
  - Parallex Bank **1000250120** — Fluffy'n'Yummy Concepts
  - Providus Bank **1306355850** — Fluffy'n'Yummy Concepts
- WhatsApp: 08133630563 · 08147081420 · 09167013447

## Handover

See `HANDOVER.md` for the owner operations checklist.
