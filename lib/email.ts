import type { Order } from "./types";
import { naira } from "./format";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] || character
  );
}

type ResendEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendResendEmail({
  to,
  subject,
  text,
  html,
}: ResendEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from || !to) {
    console.error(
      "[email] Missing RESEND_API_KEY, RESEND_FROM_EMAIL, or customer email."
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      console.error(
        "[email] Resend error:",
        response.status,
        await response.text()
      );
    }

    return response.ok;
  } catch (error) {
    console.error("[email] Failed to send email:", error);
    return false;
  }
}

export async function sendPaymentEmail(
  order: Order,
  outcome: "success" | "failure"
) {
  const to = order.customer.email?.trim();

  if (!to) {
    console.error(
      `[email] Order ${order.id} has no customer email address.`
    );
    return false;
  }

  const successful = outcome === "success";
  const isBankTransfer = order.payment.method === "bank_transfer";

  const paymentMethod = isBankTransfer
    ? "Bank transfer"
    : "Paystack";

  const subject = successful
    ? isBankTransfer
      ? `Payment receipt for order ${order.id}`
      : `Payment confirmed for order ${order.id}`
    : `Payment could not be completed for order ${order.id}`;

  const message = successful
    ? isBankTransfer
      ? `Your bank transfer of ${naira(
          order.total
        )} has been received and confirmed. This email is your payment receipt.`
      : `Your Paystack payment of ${naira(
          order.total
        )} was successful. Your order has been confirmed.`
    : `Your payment of ${naira(
        order.total
      )} could not be completed. Please try again or choose another payment method.`;

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  const orderUrl = baseUrl
    ? `${baseUrl}/order/${encodeURIComponent(order.id)}`
    : `/order/${encodeURIComponent(order.id)}`;

  const paymentReference =
    order.payment.reference || "Not available";

  const paidAt = order.payment.paidAt
    ? new Date(order.payment.paidAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      })
    : "Not available";

  const itemText = order.items
    .map((item) => {
      const name = item.variantName
        ? `${item.name} (${item.variantName})`
        : item.name;

      return `- ${name} × ${item.qty}: ${naira(
        item.unitPrice * item.qty
      )}`;
    })
    .join("\n");

  const pickupDiscountText =
    order.pickupDiscount > 0
      ? `Pickup discount: ${naira(order.pickupDiscount)}`
      : "";

  const text = [
    `Hello ${order.customer.name},`,
    "",
    message,
    "",
    `Order ID: ${order.id}`,
    `Payment method: ${paymentMethod}`,
    `Payment reference: ${paymentReference}`,
    `Payment date: ${paidAt}`,
    "",
    "Items ordered:",
    itemText,
    "",
    `Subtotal: ${naira(order.subtotal)}`,
    `Delivery: ${naira(order.deliveryFee)}`,
    pickupDiscountText,
    `${successful ? "Total paid" : "Order total"}: ${naira(
      order.total
    )}`,
    "",
    `View your order: ${orderUrl}`,
  ].join("\n");

  const itemRows = order.items
    .map((item) => {
      const name = item.variantName
        ? `${item.name} (${item.variantName})`
        : item.name;

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
            ${escapeHtml(name)}
          </td>
          <td style="padding:10px;text-align:center;border-bottom:1px solid #eeeeee;">
            ${item.qty}
          </td>
          <td style="padding:10px 0;text-align:right;border-bottom:1px solid #eeeeee;">
            ${escapeHtml(
              naira(item.unitPrice * item.qty)
            )}
          </td>
        </tr>
      `;
    })
    .join("");

  const pickupDiscountRow =
    order.pickupDiscount > 0
      ? `
        <tr>
          <td style="padding:6px 0;">Pickup discount</td>
          <td style="padding:6px 0;text-align:right;">
            -${escapeHtml(naira(order.pickupDiscount))}
          </td>
        </tr>
      `
      : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111111;">
      <h2 style="color:#111111;">
        ${successful ? "Payment receipt" : "Payment update"}
      </h2>

      <p>Hello ${escapeHtml(order.customer.name)},</p>

      <p>${escapeHtml(message)}</p>

      <div style="background:#fff9f2;padding:16px;border-radius:12px;margin:20px 0;">
        <p>
          <strong>Order ID:</strong>
          ${escapeHtml(order.id)}
        </p>

        <p>
          <strong>Payment method:</strong>
          ${escapeHtml(paymentMethod)}
        </p>

        <p>
          <strong>Payment reference:</strong>
          ${escapeHtml(paymentReference)}
        </p>

        <p>
          <strong>Payment date:</strong>
          ${escapeHtml(paidAt)}
        </p>
      </div>

      <h3>Items ordered</h3>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:10px 0;text-align:left;">Item</th>
            <th style="padding:10px;text-align:center;">Qty</th>
            <th style="padding:10px 0;text-align:right;">Amount</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table style="width:100%;margin-top:20px;border-top:1px solid #eeeeee;padding-top:12px;">
        <tbody>
          <tr>
            <td style="padding:6px 0;">Subtotal</td>
            <td style="padding:6px 0;text-align:right;">
              ${escapeHtml(naira(order.subtotal))}
            </td>
          </tr>

          <tr>
            <td style="padding:6px 0;">Delivery</td>
            <td style="padding:6px 0;text-align:right;">
              ${escapeHtml(naira(order.deliveryFee))}
            </td>
          </tr>

          ${pickupDiscountRow}

          <tr>
            <td style="padding:10px 0;font-size:18px;">
              <strong>${successful ? "Total paid" : "Order total"}</strong>
            </td>
            <td style="padding:10px 0;text-align:right;font-size:18px;">
              <strong>${escapeHtml(naira(order.total))}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top:24px;">
        <a
          href="${escapeHtml(orderUrl)}"
          style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;"
        >
          View your order
        </a>
      </p>

      <p style="margin-top:28px;color:#666666;font-size:12px;">
        Thank you for shopping with Fluffy'n'Yummy Mall.
      </p>
    </div>
  `;

  return sendResendEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendWelcomeEmail(email: string) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  const shopUrl = baseUrl ? `${baseUrl}/shop` : "/shop";

  const message =
    "Welcome to Fluffy'n'Yummy Mall. Your customer account is ready, and you can now checkout and track your orders from one place.";

  return sendResendEmail({
    to: email.trim(),
    subject: "Welcome to Fluffy'n'Yummy Mall",
    text: `${message}\n\nStart shopping: ${shopUrl}`,
    html: `
      <p>${escapeHtml(message)}</p>
      <p>
        <a href="${escapeHtml(shopUrl)}">
          Start shopping
        </a>
      </p>
    `,
  });
}
