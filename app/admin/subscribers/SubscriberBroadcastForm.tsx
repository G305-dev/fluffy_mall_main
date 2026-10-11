"use client";

import { useState } from "react";

type SendResult = {
  total?: number;
  sent?: number;
  failed?: number;
  failures?: Array<{
    email: string;
    error: string;
  }>;
  error?: string;
};

export default function SubscriberBroadcastForm({
  activeCount,
}: {
  activeCount: number;
}) {
  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<SendResult | null>(null);

  async function submit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setFeedback(null);
    setResult(null);

    const confirmed = window.confirm(
      `Send this update to ${activeCount} active subscriber${
        activeCount === 1 ? "" : "s"
      }?`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/subscribers/send",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subject,
            message,
          }),
        }
      );

      const data =
        (await response.json()) as SendResult;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Newsletter could not be sent."
        );
      }

      setResult(data);

      setFeedback(
        `Newsletter sent to ${data.sent || 0} subscriber${
          data.sent === 1 ? "" : "s"
        }. ${
          data.failed || 0
        } failed.`
      );

      if (!data.failed) {
        setSubject("");
        setMessage("");
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Newsletter could not be sent."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-5 ring-1 ring-cream-200 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
          Resend newsletter
        </p>

        <h2 className="mt-1 font-display text-2xl text-cocoa-800">
          Send an update
        </h2>

        <p className="mt-2 text-sm text-cocoa-700/70">
          This message will be sent to{" "}
          <strong>{activeCount}</strong> active newsletter subscriber
          {activeCount === 1 ? "" : "s"}.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-5 grid gap-4"
      >
        <label className="text-sm text-cocoa-800">
          Email subject

          <input
            required
            maxLength={150}
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value)
            }
            placeholder="New arrivals are now available"
            className="mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-3"
          />
        </label>

        <label className="text-sm text-cocoa-800">
          Message

          <textarea
            required
            rows={8}
            maxLength={20000}
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            placeholder="Write your newsletter update here..."
            className="mt-1 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-3"
          />
        </label>

        <button
          type="submit"
          disabled={busy || activeCount === 0}
          className="w-full rounded-full bg-terracotta-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-fit"
        >
          {busy
            ? "Sending newsletter..."
            : "Send update"}
        </button>
      </form>

      {feedback && (
        <p className="mt-4 rounded-xl bg-cream-50 p-3 text-sm text-cocoa-800">
          {feedback}
        </p>
      )}

      {result &&
        result.failures &&
        result.failures.length > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">
              Failed recipients
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.failures.map(
                (failure) => (
                  <li key={failure.email}>
                    {failure.email}:{" "}
                    {failure.error}
                  </li>
                )
              )}
            </ul>
          </div>
        )}
    </section>
  );
}