import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/subscribers";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const values =
    body &&
    typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const name = String(
    values.name || ""
  ).trim();

  const email = String(
    values.email || ""
  )
    .trim()
    .toLowerCase();

  if (!name || name.length > 80) {
    return NextResponse.json(
      {
        error: "Please enter a valid name.",
      },
      { status: 400 }
    );
  }

  if (
    !email ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email)
  ) {
    return NextResponse.json(
      {
        error: "Please enter a valid email address.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await addSubscriber({
      name,
      email,
    });

    return NextResponse.json({
      ok: true,
      alreadySubscribed: !result.created,
    });
  } catch (error) {
    console.error(
      "[SUBSCRIBER_CREATE_ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          "We could not save your subscription. Please try again.",
      },
      { status: 500 }
    );
  }
}