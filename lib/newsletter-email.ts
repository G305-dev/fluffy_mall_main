import {
  createSubscriberToken,
  normalizeSubscriberEmail,
} from "@/lib/subscriber-unsubscribe";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>\"']/g,
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

function messageToHtml(message: string) {
  return message
    .trim()
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(
          paragraph
        ).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

export async function sendNewsletterEmail(input: {
  to: string;
  name: string;
  subject: string;
  message: string;
}) {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
     process.env.RESEND_NEWSLETTER_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL;

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  const email = normalizeSubscriberEmail(
    input.to
  );

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured."
    );
  }

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not configured."
    );
  }

  const token = createSubscriberToken(
    email
  );

  const unsubscribeUrl =
    `${baseUrl}/api/subscribers/unsubscribe` +
    `?email=${encodeURIComponent(email)}` +
    `&token=${encodeURIComponent(token)}`;

  const greeting = input.name.trim()
    ? `Hello ${input.name.trim()},`
    : "Hello,";

  const text = [
    greeting,
    "",
    input.message.trim(),
    "",
    "You are receiving this email because you subscribed to Fluffy'n'Yummy Mall updates.",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#291b16;">
      <h2>${escapeHtml(input.subject)}</h2>

      <p>${escapeHtml(greeting)}</p>

      ${messageToHtml(input.message)}

      <p style="margin-top:28px;color:#777;font-size:12px;">
        You are receiving this email because you subscribed to Fluffy'n'Yummy Mall updates.
      </p>

      <p style="font-size:12px;">
        <a href="${escapeHtml(unsubscribeUrl)}">
          Unsubscribe from newsletter updates
        </a>
      </p>
    </div>
  `;

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to:
          process.env.RESEND_REPLY_TO_EMAIL ||
          from,
        subject: input.subject.trim(),
        text,
        html,
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `Resend returned HTTP ${response.status}: ${detail}`
    );
  }

  return true;
}