# Fluffy'n'Yummy Mall
A Next.js storefront and operations dashboard for Fluffy'n'Yummy Mall, an online shop based in Anthony Village, Lagos. The current customer journey is:
**browse → choose a product/variant → cart → guest or customer checkout → Paystack or bank transfer → WhatsApp/order tracking → admin fulfilment**
> This README describes the repository as it exists today. It is intentionally not a deployment claim: verify payment, email, storage, and delivery behaviour in a staging environment before launch.
## Overview
The application provides:
- Public storefront, category browsing, product detail pages, wishlist, cart, checkout, contact, and about pages.
- Customer accounts with email/password authentication and optional Google OAuth.
- Order creation, order detail/track pages, payment selection, and WhatsApp hand-off.
- Admin login and dashboard for orders, products, variants, stock, settings, analytics, and image uploads.
- Paystack verification and webhook handling with signature validation.
- MongoDB-backed products, orders, settings, and customer accounts, with JSON files retained as seed/fallback data.
- Dynamic sitemap and robots metadata.
## Features
### Storefront
- Home page with promotional content and product discovery.
- Shop and category routes: `/shop` and `/shop/[category]`.
- Product routes: `/product/[slug]`.
- Product cards, variant selection, stock display, wishlist, cart quantity management, and responsive navigation.
- WhatsApp messages for products, carts, and orders.
- Customer pages: `/login`, `/signup`, `/account/orders`, `/wishlist`, `/track`, and `/order/[id]`.
### Checkout and fulfilment
- Guest checkout and signed-in customer checkout.
- Delivery or pickup fulfilment selection.
- Lagos and outside-Lagos zones.
- Paystack payment flow: `/pay/paystack/[id]`.
- Manual bank transfer flow: `/pay/bank/[id]`.
- Order confirmation and payment status pages.
**Current implementation note:** `lib/delivery.ts` currently returns zero delivery fees and zero pickup discount. The settings model and admin UI contain delivery rules, but the calculation function is temporarily disabled and should be completed and tested before relying on delivery charges, free-delivery thresholds, or pickup discounts.
## Technology stack
- Next.js `14.2.5` with the App Router.
- React 18 and TypeScript 5.
- Tailwind CSS 3 with PostCSS.
- MongoDB driver 6 for persistence.
- `@vercel/blob` for admin image uploads.
- Paystack for card, transfer, and USSD payment processing.
- Resend HTTP API for payment and welcome emails.
- Lucide React for icons.
- Node.js scripts for seeding, reset, and database checks.
## Storage architecture
### MongoDB
`lib/db.ts` uses MongoDB through `lib/mongo.ts`:
| Collection | Purpose |
| --- | --- |
| `products` | Product catalogue, display order, prices, stock, variants, and images |
| `orders` | Customer orders, items, totals, fulfilment, payment, and status |
| `settings` | One store settings document identified by `key: "store"` |
| `customers` | Customer accounts and password hashes |
The database name defaults to `fluffy_mall` and can be changed with `MONGODB_DB`. MongoDB collections are created on first write.
### JSON seed and fallback data
The `data/` directory contains:
- `products.json`
- `orders.json`
- `customers.json`
- `settings.json`
The current database layer reads MongoDB for normal operation and uses `data/settings.json` as a settings fallback when the MongoDB settings document does not exist. Treat these files as seed/sample data rather than a production backup.
## Project structure
```text
app/                    Next.js pages, layouts, metadata, and API routes
  api/                  Admin, customer, order, settings, and Paystack endpoints
  admin/                Admin dashboard, orders, products, settings, analytics
  product/              Product detail routes
  shop/                 Shop and category routes
  checkout/             Checkout flow
  pay/                  Bank-transfer and Paystack payment pages
components/             Shared UI and client providers
lib/                    Auth, MongoDB, orders, delivery, email, types, and helpers
data/                   Seed/fallback JSON data
public/                 Static assets and product images
scripts/                Seed, reset, database check, and Next cache utilities
middleware.ts           Request middleware
next.config.mjs         Next.js configuration
```
## Requirements
- Node.js 20 or newer recommended.
- npm.
- A MongoDB deployment for persistent data (MongoDB Atlas is suitable).
- Paystack keys for live/test payment processing.
- A Resend account and verified sender for email notifications.
- Google OAuth credentials only if Google sign-in is enabled.
- Vercel Blob credentials only if admin image uploads are used.
## Environment variables
Create `.env.local` in the project root. Never commit it.
### Required for persistent operation
```dotenv
MONGODB_URI=mongodb+srv://...
MONGODB_DB=fluffy_mall
ADMIN_PASSWORD=use-a-long-unique-password
CUSTOMER_SESSION_SECRET=use-a-long-random-secret
NEXT_PUBLIC_APP_URL=https://your-domain.example
```
### Payments
```dotenv
PAYSTACK_SECRET_KEY=sk_test_or_live_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_or_live_...
```
Configure the Paystack webhook URL as:
```text
https://your-domain.example/api/paystack/webhook
```
### Customer Google sign-in
```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
Register this callback URL with Google:
```text
https://your-domain.example/api/customer/google/callback
```
### Email notifications
```dotenv
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=orders@your-verified-domain.example
RESEND_REPLY_TO_EMAIL=hello@your-domain.example
```
Payment success/failure receipts and welcome emails are sent through Resend. The sender domain must be verified in Resend.
### Optional deployment and preview variables
```dotenv
NEXT_PUBLIC_BASE_URL=https://your-domain.example
PREVIEW_ADMIN_BYPASS=1
ADMIN_HOST=your-admin-host.example
```
`PREVIEW_ADMIN_BYPASS=1` is intended only for a trusted local/preview environment. Do not enable it in production. `ADMIN_HOST` is available to deployment/auth configuration but should be validated against the current hosting setup before use.
## Installation
```bash
git clone <repository-url>
cd fluffy_mall_main
npm install
cp .env.example .env.local # if an example file is added to the project
```
If there is no `.env.example`, create `.env.local` manually using the variables above, then restart Next.js after changing environment variables.
Check the database connection with:
```bash
npm run db-check
```
Seed the catalogue/settings when appropriate:
```bash
npm run seed
```
## Development
Start the development server:
```bash
npm run dev
```
The server listens on `0.0.0.0:3000`. Open `http://localhost:3000` locally.
Useful scripts:
| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development mode |
| `npm run dev:clean` | Clear the Next build cache, then start development mode |
| `npm run lint` | Run Next/ESLint checks |
| `npm run db-check` | Validate MongoDB connectivity/configuration |
| `npm run seed` | Seed initial data; inspect the script before running against production |
| `npm run reset` | Reset data according to the reset script; use with care |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
## Production build
```bash
npm ci
npm run lint
npm run build
npm run start
```
Set all production environment variables in the hosting provider rather than in the repository. Confirm that the app's public URL, MongoDB network access, Paystack webhook, Resend sender, OAuth callback, and Blob permissions are configured before launch.
## Admin dashboard
Open `/admin` and authenticate with `ADMIN_PASSWORD`.
Admin areas include:
- **Orders:** search orders, review payment/fulfilment details, confirm bank transfers, and update order status.
- **Products:** edit catalogue data, prices, stock, images, and variants.
- **Settings:** edit store settings and delivery-rule values.
- **Analytics:** view operational summary data.
The admin session is cookie-based and short-lived. Use HTTPS in production and rotate the admin password if it has ever been shared or exposed.
## Products and variants
Products are represented by `lib/types.ts` and stored in MongoDB. A product can include:
- Name, slug, description, category, image(s), price, and base stock.
- Variant combinations such as size and colour.
- Variant-specific image, price, and stock.
- Delivery note and product metadata.
The admin API validates variant prices/stock and rejects duplicate size/colour combinations. Product ordering is preserved through an internal MongoDB `sortOrder` field.
## Payments
### Paystack
The server verifies transactions using `PAYSTACK_SECRET_KEY`; the browser public key is supplied with `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. The webhook endpoint validates the `x-paystack-signature` HMAC before updating an order.
Do not treat a browser success callback as the final source of truth. Use server-side verification and webhook events when testing or reconciling a live payment.
### Bank transfer
The checkout can create an order for manual bank transfer. The customer can indicate that payment was made; an admin must match the amount and order ID/narration against the business account before confirming payment.
Never put secret payment credentials in client code, README files, screenshots, or Git history.
## Email notifications
`lib/email.ts` sends through the Resend API:
- Payment receipt after a successful/confirmed payment.
- Payment failure notification.
- Welcome email after customer registration.
If Resend variables or a customer email are missing, the app logs the failure and does not send the message. Test both successful and failed payment paths with a verified test address.
## SEO and sitemap
- `app/sitemap.ts` generates the sitemap.
- `app/robots.ts` allows public pages and disallows `/admin` and `/api`.
- The current robots sitemap URL is `https://fluffynyummystore.com/sitemap.xml`; update it if the production domain changes.
- Product/category URLs should use stable slugs and the canonical public app URL.
## Deployment
A Vercel-style deployment is supported by the existing Next.js configuration:
1. Provision MongoDB and allow the deployment to connect.
2. Configure production environment variables.
3. Deploy the project and run a production build.
4. Configure Paystack's webhook at `/api/paystack/webhook`.
5. Register the Google callback URL if OAuth is enabled.
6. Verify the Resend sender domain.
7. Test catalogue browsing, variant stock, guest checkout, customer login, both payment methods, email, WhatsApp, admin status updates, and order tracking.
8. Confirm backups and a rollback procedure for MongoDB.
The app also references Vercel Blob for admin uploads. Configure the Blob integration according to the hosting provider before using upload functionality.
## Troubleshooting
### `MONGODB_URI is not set`
Add `MONGODB_URI` and optionally `MONGODB_DB` to `.env.local`, restart the dev server, and run `npm run db-check`.
### Admin login does not persist in a preview
Embedded previews can interfere with cookies. For a trusted non-production preview only, set `PREVIEW_ADMIN_BYPASS=1`, then restart the server. Never use this bypass in production.
### Paystack is unavailable
Confirm both public and secret keys are present, the keys belong to the same environment, the server can reach Paystack, and the webhook URL is correct. Inspect server logs and Paystack webhook delivery history.
### Emails are not arriving
Verify `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, the domain verification status, recipient address, and server logs. `RESEND_REPLY_TO_EMAIL` is optional.
### Images fail to upload
Check the hosting provider's Blob configuration and admin authentication. Product image URLs can still be managed through the product data/API path if upload storage is not configured.
### Delivery totals look wrong
Review `lib/delivery.ts`. The current function deliberately returns zero delivery fees and zero pickup discounts despite reading delivery settings. This must be implemented before launch if delivery pricing is required.
## Security notes
- Keep `.env.local`, MongoDB URIs, Paystack secret keys, Resend keys, OAuth secrets, and Blob tokens out of Git.
- Use long, unique values for `ADMIN_PASSWORD` and `CUSTOMER_SESSION_SECRET`.
- Keep `PREVIEW_ADMIN_BYPASS` disabled in production.
- Use HTTPS and restrict MongoDB network access.
- Rely on server-side Paystack verification/webhooks, not browser state alone.
- Review admin authorization on every admin API route before exposing the app publicly.
- Back up MongoDB and avoid using `npm run reset` against production without an explicit recovery plan.
## Handover
See [`HANDOVER.md`](./HANDOVER.md) for the owner operations checklist. Before launch, replace any legacy/default credentials, verify the business payment accounts privately, complete the delivery calculation, and perform a real end-to-end test in the intended Paystack environment.
## Licence
No licence file is currently defined in the repository. Add one before distributing the project outside the owning organisation.
