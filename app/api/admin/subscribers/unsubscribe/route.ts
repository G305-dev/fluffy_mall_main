import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  unsubscribeSubscriber,
} from "@/lib/subscribers";
import {
  verifySubscriberToken,
  normalizeSubscriberEmail,
} from "@/lib/subscriber-unsubscribe";

function page(
  title: string,
  message: string
) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            padding: 40px 16px;
            background: #fff9f2;
            color: #291b16;
            font-family: Arial, sans-serif;
          }

          main {
            max-width: 560px;
            margin: 0 auto;
            padding: 32px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(41, 27, 22, 0.08);
          }

          a {
            color: #d95f2b;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${title}</h1>
          <p>${message}</p>
          <p>
            <a href="/">Return to Fluffy'n'Yummy Mall</a>
          </p>
        </main>
      </body>
    </html>
  `;
}

export async function GET(
  request: NextRequest
) {
  const email = normalizeSubscriberEmail(
    request.nextUrl.searchParams.get(
      "email"
    ) || ""
  );

  const token =
    request.nextUrl.searchParams.get(
      "token"
    ) || "";

  if (
    !email ||
    !token ||
    !verifySubscriberToken(
      email,
      token
    )
  ) {
    return new NextResponse(
      page(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired."
      ),
      {
        status: 400,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  await unsubscribeSubscriber(email);

  return new NextResponse(
    page(
      "You have been unsubscribed",
      `${email} will no longer receive newsletter updates from us.`
    ),
    {
      headers: {
        "Content-Type":
          "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}