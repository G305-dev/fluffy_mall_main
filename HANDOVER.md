# Fluffy'n'Yummy Mall — Project Handover
This document explains how to operate, maintain, test, and hand over the current Fluffy'n'Yummy Mall application.
## 1. Project summary
Fluffy'n'Yummy Mall is a Next.js 14 online store for customers in Lagos and across Nigeria. The application supports:
- Product browsing and category pages
- Product variants, pricing, stock, wishlist, and cart
- Guest checkout and customer accounts
- Paystack payments and manual bank transfer orders
- WhatsApp order communication
- Customer order tracking
- Admin management of orders, products, variants, stock, settings, and analytics
- MongoDB persistence
- Resend email notifications
The main customer flow is:
```text
Browse → Product/variant → Cart → Checkout → Payment → WhatsApp/order tracking → Fulfilment
```
## 2. Important project locations
| Location | Purpose |
| --- | --- |
| `app/` | Storefront pages, admin pages, metadata, and API routes |
| `app/admin/` | Admin dashboard and management screens |
| `app/api/` | Admin, customer, order, settings, and payment endpoints |
| `components/` | Shared React UI components and client-side providers |
| `lib/db.ts` | Product, order, and settings data access |
| `lib/mongo.ts` | MongoDB connection and collection names |
| `lib/customer-auth.ts` | Customer authentication and account persistence |
| `lib/auth.ts` | Admin authentication and session handling |
| `lib/delivery.ts` | Delivery and pickup calculation |
| `lib/email.ts` | Resend email notifications |
| `lib/whatsapp.ts` | WhatsApp message generation |
| `lib/types.ts` | Product, order, customer, payment, and settings types |
| `data/` | Seed/sample JSON data and settings fallback |
| `public/images/` | Static product and site images |
| `scripts/` | Seed, reset, database check, and cache utilities |
| `README.md` | Technical setup and repository documentation |
## 3. Local setup
Requirements:
- Node.js 20 or newer recommended
- npm
- A reachable MongoDB instance
Install and start the application:
```bash
npm install
npm run dev
```
The development server runs on port 3000.
Useful commands:
```bash
npm run lint       # Run ESLint/Next checks
npm run db-check   # Check MongoDB connectivity
npm run seed       # Seed the configured database; inspect first
npm run reset      # Reset data according to scripts/reset.mjs; use with care
npm run build      # Build for production
npm run start      # Start the production build
npm run dev:clean  # Clear the Next cache and start development mode
```
## 4. Environment configuration
Create `.env.local` locally or configure the same values in the hosting provider. Never commit credentials.
### Core variables
```dotenv
MONGODB_URI=mongodb+srv://...
MONGODB_DB=fluffy_mall
ADMIN_PASSWORD=<unique-admin-password>
CUSTOMER_SESSION_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
```
### Paystack
```dotenv
PAYSTACK_SECRET_KEY=sk_test_or_live_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_or_live_...
```
Paystack webhook URL:
```text
https://your-production-domain.example/api/paystack/webhook
```
### Google customer login
```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
OAuth callback URL:
```text
https://your-production-domain.example/api/customer/google/callback
```
### Email notifications
```dotenv
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=orders@your-verified-domain.example
RESEND_REPLY_TO_EMAIL=hello@your-domain.example
```
### Optional values
```dotenv
NEXT_PUBLIC_BASE_URL=https://your-production-domain.example
PREVIEW_ADMIN_BYPASS=1
ADMIN_HOST=your-admin-host.example
```
`PREVIEW_ADMIN_BYPASS=1` is only for a trusted preview environment. It must not be enabled in production.
## 5. Storage and database operations
The application uses MongoDB collections:
- `products`: catalogue records and variants
- `orders`: customer orders and payment/fulfilment status
- `customers`: customer accounts and password hashes
- `settings`: one store settings document with `key: "store"`
The `data/` JSON files contain seed or fallback data. They are not a substitute for production backups.
Before changing production data:
1. Confirm the target environment.
2. Back up the relevant MongoDB database.
3. Record the intended change.
4. Make the change through the admin UI where possible.
5. Confirm the result on the storefront and admin dashboard.
Do not run `npm run reset` against production without a verified backup and rollback plan.
## 6. Daily store operations
### Review new orders
1. Open `/admin`.
2. Go to **Orders**.
3. Open each new order and verify the customer, items, selected variants, quantity, total, fulfilment method, and payment method.
4. For Paystack orders, confirm that the server-side verification or webhook has marked the payment correctly.
5. For bank transfers, verify the payment against the correct business account and order ID/narration before confirming it.
6. Contact the customer through the order's WhatsApp action when clarification is needed.
### Order status flow
Use the status sequence that matches the real operation:
```text
Pending payment → Paid → Processing → Out for delivery → Completed
```
For pickup orders:
```text
Pending payment → Paid → Processing → Awaiting pickup → Completed
```
Use cancellation or failure statuses only when the order is genuinely cancelled or the payment failed. Keep the website status and any WhatsApp communication consistent.
### Completing an order
1. Confirm payment.
2. Confirm stock and selected variant.
3. Prepare and pack the order.
4. Update to **Processing**.
5. Update to **Out for delivery** or **Awaiting pickup**.
6. Send the customer the appropriate WhatsApp update.
7. Mark **Completed** after delivery or collection.
## 7. Products, variants, and stock
Products can be managed from **Admin → Products**.
A product may include:
- Name and slug
- Category and description
- Base price and stock
- Images
- Size/colour variants
- Variant-specific price, image, and stock
- Delivery note
When editing a product:
1. Confirm the name and slug are customer-friendly.
2. Check every image URL and image preview.
3. Check the base price and variant prices in naira.
4. Update stock for the exact variant, not only the base product.
5. Confirm that no size/colour combination is duplicated.
6. Save and verify the product page as a customer.
When a product sells out, update the relevant stock immediately. Do not advertise a variant that cannot be fulfilled.
## 8. Delivery and pickup
The store supports Lagos and outside-Lagos zones and stores delivery settings in the admin settings area.
**Important current limitation:** `lib/delivery.ts` currently returns:
- Delivery fee: `0`
- Pickup discount: `0`
- Free delivery: `false`
Although delivery thresholds and fees exist in the settings model, the calculation logic is currently disabled. Before launch, the owner/developer must agree the live rules, implement them, and test boundary cases such as:
- One naira below the Lagos free-delivery threshold
- Exactly at the Lagos threshold
- One naira below the outside-Lagos threshold
- Exactly at the outside-Lagos threshold
- Pickup with and without a discount
Do not advertise delivery pricing until this behaviour has been verified.
## 9. Payment operations
### Paystack
Paystack supports the configured card, transfer, and USSD flow.
For a payment issue, check:
1. Public and secret keys belong to the same Paystack environment.
2. The browser has the public key.
3. The server has the secret key.
4. The order exists in MongoDB.
5. The server-side transaction verification succeeds.
6. The webhook URL is correct and reachable.
7. The `x-paystack-signature` validation is passing.
8. The order payment reference and status are correct.
Never confirm a payment only because the browser displayed a success message.
### Manual bank transfer
For a bank-transfer order:
1. Ask the customer to use the order ID as narration where applicable.
2. Check the actual business account transaction.
3. Match the amount and order ID/customer details.
4. Confirm the payment in Admin → Orders.
5. Only then move the order to Processing.
Never publish or accept an unverified personal account for customer payments. Keep account details private and confirm them against the current business records before launch.
## 10. Email notifications
`lib/email.ts` uses Resend for:
- Welcome emails after customer registration
- Successful payment receipts
- Payment failure notifications
If an email is not delivered:
1. Check `RESEND_API_KEY`.
2. Check that `RESEND_FROM_EMAIL` uses a verified domain.
3. Confirm the customer email is valid.
4. Review server logs and Resend activity.
5. Confirm the order/payment event reached the server.
Email failure should not be treated as proof that a payment failed. Verify payment independently.
## 11. WhatsApp operations
The application generates pre-filled WhatsApp messages for products, carts, and orders. Before launch:
- Confirm the business WhatsApp number in `lib/whatsapp.ts`.
- Confirm the message includes the order ID, item names, variants, quantities, total, fulfilment, and payment status.
- Test on both mobile and desktop.
- Keep the public website and social-media links aligned with the active store domain.
## 12. Customer accounts
Customers can:
- Create an account
- Sign in with email and password
- Optionally sign in with Google
- View their orders
- Sign out
For account problems, verify the email address, session secret, MongoDB customer record, OAuth credentials, and callback URL. Do not inspect or expose customer password hashes.
## 13. SEO and public URLs
The application includes:
- `app/sitemap.ts` for sitemap generation
- `app/robots.ts` for crawler rules
- Public product and category routes
Before launch, confirm that the sitemap domain matches the production domain. Admin and API routes should remain excluded from indexing.
## 14. Deployment checklist
Before production launch:
- [ ] Production MongoDB database created and backed up
- [ ] MongoDB network access restricted appropriately
- [ ] All production environment variables configured
- [ ] Strong admin password set
- [ ] Customer session secret set to a long random value
- [ ] `PREVIEW_ADMIN_BYPASS` disabled
- [ ] Paystack test/live keys verified
- [ ] Paystack webhook configured
- [ ] Resend sender domain verified
- [ ] Google OAuth callback configured, if enabled
- [ ] Image upload storage configured, if used
- [ ] Delivery logic implemented and tested
- [ ] Product prices and stock reviewed
- [ ] Guest checkout tested
- [ ] Customer account tested
- [ ] Paystack success and failure tested
- [ ] Bank transfer workflow tested
- [ ] Email notifications tested
- [ ] WhatsApp links tested
- [ ] Admin order status changes tested
- [ ] Sitemap and robots URLs checked
- [ ] Production build completed successfully
- [ ] Rollback and database recovery plan documented
## 15. End-to-end smoke test
Use a small test order before announcing the store:
1. Browse the home and shop pages.
2. Open a product with a variant.
3. Add the correct variant to the cart.
4. Complete checkout with a test customer.
5. Create an order.
6. Complete a test payment in the intended Paystack mode, or test the manual transfer flow.
7. Confirm the order is stored in MongoDB.
8. Confirm the admin can see and update the order.
9. Confirm the payment result is reflected on the order page.
10. Confirm the WhatsApp message opens with the correct details.
11. Confirm the email is sent when configured.
12. Confirm the order can move through fulfilment statuses.
Do not announce publicly until the complete test passes.
## 16. Security and privacy
- Never commit `.env.local` or credentials.
- Never place Paystack secret keys, MongoDB credentials, Resend keys, OAuth secrets, or Blob tokens in browser code.
- Keep the admin password unique and rotate it if exposed.
- Never use the preview admin bypass in production.
- Use HTTPS in production.
- Restrict MongoDB access and maintain backups.
- Do not share customer addresses, phone numbers, order details, or password data unnecessarily.
- Verify all payment events server-side.
- Review admin authorization before adding new admin API routes.
- Remove any legacy/default credentials from deployment settings before launch.
## 17. Known follow-up work
1. Complete and test the delivery and pickup calculation in `lib/delivery.ts`.
2. Add an `.env.example` containing variable names only, if desired.
3. Confirm the final production domain in sitemap/robots configuration.
4. Confirm image upload storage and permissions in the deployment environment.
5. Add automated tests for delivery thresholds, order totals, payment verification, and admin authorization.
6. Document the private business payment accounts in the organisation's secure credential system, not in Git or this file.
7. Confirm the production backup and restore procedure.
## 18. Ownership and escalation
The store owner is responsible for:
- Product catalogue, pricing, stock, delivery policy, bank reconciliation, and fulfilment.
- Keeping payment, email, WhatsApp, and domain accounts active.
- Approving production changes.
The developer/technical owner is responsible for:
- Code changes, deployments, database migrations, payment/webhook issues, authentication, backups, and incident response.
When escalating an issue, include:
- Order ID, without sharing unnecessary customer data
- Time and timezone
- Payment method and reference, if applicable
- Exact error message or screenshot
- Relevant server/deployment log entry
- Whether the issue affects one order or all customers
## 19. Related documentation
- [`README.md`](./README.md) — technical setup, architecture, and deployment reference
- `package.json` — available development and production scripts
- `scripts/` — database and maintenance utilities
