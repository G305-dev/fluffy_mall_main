import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getActiveSubscribers } from "@/lib/subscribers";
import { sendNewsletterEmail } from "@/lib/newsletter-email";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  if (!await isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(
    () => null
  );

  if (
    !body ||
    typeof body !== "object"
  ) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const values =
    body as Record<string, unknown>;

  const subject = String(
    values.subject || ""
  ).trim();

  const message = String(
    values.message || ""
  ).trim();

  if (
    subject.length < 3 ||
    subject.length > 150
  ) {
    return NextResponse.json(
      {
        error:
          "Subject must be between 3 and 150 characters.",
      },
      { status: 400 }
    );
  }

  if (
    message.length < 3 ||
    message.length > 20000
  ) {
    return NextResponse.json(
      {
        error:
          "Message must be between 3 and 20,000 characters.",
      },
      { status: 400 }
    );
  }

  const subscribers =
    await getActiveSubscribers();

  if (subscribers.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      sent: 0,
      failed: 0,
      failures: [],
    });
  }

  let sent = 0;
  let failed = 0;

  const failures: Array<{
    email: string;
    error: string;
  }> = [];

  /*
   * Send in small batches so a large list does
   * not create one oversized request.
   */
  const batchSize = 10;

  for (
    let index = 0;
    index < subscribers.length;
    index += batchSize
  ) {
    const batch = subscribers.slice(
      index,
      index + batchSize
    );

    const results = await Promise.all(
      batch.map(async (subscriber) => {
        try {
          await sendNewsletterEmail({
            to: subscriber.email,
            name: subscriber.name,
            subject,
            message,
          });

          return {
            email: subscriber.email,
            success: true,
          };
        } catch (error) {
          return {
            email: subscriber.email,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Email send failed.",
          };
        }
      })
    );

    for (const result of results) {
      if (result.success) {
        sent += 1;
      } else {
        failed += 1;

        failures.push({
          email: result.email,
          error:
            result.error ||
            "Email send failed.",
        });
      }
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    total: subscribers.length,
    sent,
    failed,
    failures,
  });
}