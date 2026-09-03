import { Order } from "./types";
import { naira } from "./format";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export async function sendPaymentEmail(order: Order, outcome: "success" | "failure") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = order.customer.email;
  if (!apiKey || !from || !to) return false;

  const successful = outcome === "success";
  const subject = successful
    ? `Payment confirmed for order ${order.id}`
    : `Payment could not be completed for order ${order.id}`;
  const message = successful
    ? `Your Paystack payment of ${naira(order.total)} was successful. Your order has been confirmed.`
    : `Your Paystack payment for ${naira(order.total)} could not be completed. Please try again or choose another payment method.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const orderUrl = appUrl ? `${appUrl}/order/${order.id}` : `/order/${order.id}`;

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
      text: `${message}\n\nOrder: ${order.id}\nPayment reference: ${order.payment.reference || "Not available"}\nView order: ${orderUrl}`,
      html: `<p>${escapeHtml(message)}</p><p><strong>Order:</strong> ${escapeHtml(order.id)}<br><strong>Payment reference:</strong> ${escapeHtml(order.payment.reference || "Not available")}</p><p><a href="${escapeHtml(orderUrl)}">View your order</a></p>`,
    }),
  });

  return response.ok;
}

export async function sendWelcomeEmail(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !email) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const shopUrl = appUrl ? `${appUrl}/shop` : "/shop";
  const message = "Welcome to Fluffy'n'Yummy Mall. Your customer account is ready, and you can now checkout and track your orders from one place.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Welcome to Fluffy'n'Yummy Mall",
      text: `${message}\n\nStart shopping: ${shopUrl}`,
      html: `<p>${escapeHtml(message)}</p><p><a href="${escapeHtml(shopUrl)}">Start shopping</a></p>`,
    }),
  });

  return response.ok;
}
