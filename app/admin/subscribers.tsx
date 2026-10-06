import { getSubscribers } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-600">
            Marketing
          </p>

          <h1 className="mt-1 font-display text-3xl">
            Mailing list
          </h1>

          <p className="mt-2 text-sm text-cocoa-700/70">
            Customers who subscribed to product updates and special offers.
          </p>
        </div>

        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-cocoa-800 ring-1 ring-cream-200">
          {subscribers.length} subscriber
          {subscribers.length === 1 ? "" : "s"}
        </div>
      </div>

      {subscribers.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-8 text-center ring-1 ring-cream-200">
          <h2 className="font-display text-2xl text-cocoa-800">
            No subscribers yet
          </h2>

          <p className="mt-2 text-sm text-cocoa-700/70">
            Subscribers will appear here after they complete the newsletter form.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl bg-white ring-1 ring-cream-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-cream-200 bg-cream-50 text-xs uppercase tracking-wider text-cocoa-700/70">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Name
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Email
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Subscribed
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cream-100">
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.email}
                    className="transition hover:bg-cream-50"
                  >
                    <td className="px-5 py-4 font-medium text-cocoa-800">
                      {subscriber.name}
                    </td>

                    <td className="px-5 py-4 text-cocoa-700">
                      <a
                        href={`mailto:${subscriber.email}`}
                        className="break-all text-terracotta-600 hover:underline"
                      >
                        {subscriber.email}
                      </a>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-cocoa-700/70">
                      {formatDate(
                        subscriber.subscribedAt
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}