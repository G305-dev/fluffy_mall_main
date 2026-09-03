# Fluffy'n'Yummy Mall — Owner handover

## Daily operations

1. Open **Admin → Orders**.
2. **Bank transfers**: match the amount and narration (order ID) to Parallex `1000250120` or Providus `1306355850`, then tap **Confirm bank transfer**.
3. Move the order: Paid → Processing → Out for delivery **or** Awaiting pickup → Completed.
4. If the customer WhatsApps a screenshot, search the order ID and update the same record so the website and WhatsApp stay in sync.

## Adding / changing products

Admin → Products: edit name, price (naira, no commas), and stock. Save. For new products after launch, a developer can append to `data/products.json` or we add a full “new product” form in a later release.

## Delivery rules

Admin → Settings. Boundary tests: ₦69,999 (Lagos pays fee), ₦70,000 (Lagos free), ₦149,999 (outside pays fee), ₦150,000 (outside free).

## Payments

- **Paystack**: card, transfer, USSD. When live keys are set (`PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`), point the Paystack webhook to `https://fluffynyummy.com/api/paystack/webhook`.
- **Manual transfer**: customer sees company accounts and taps “I have paid”. You confirm in admin. Never accept a personal account.

## WhatsApp

Every product, cart and confirmation page has a pre-filled message to 08133630563. Keep the Instagram bio link pointing at fluffynyummy.com **and** WhatsApp.

## Do not announce on Instagram until

A real end-to-end test payment (even ₦100) succeeds: order record created, status Paid, WhatsApp message opens with the order summary.

## Credentials (change after first login)

- Admin password: `FluffyAdmin1`
- Set `ADMIN_PASSWORD` in production hosting env.
