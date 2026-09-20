import TraceposCheck from "./TraceposCheck";

export default function TraceposCheckPage() {
  return (
    <div>
      <h1 className="font-display text-3xl">
        Tracepos Stock Check
      </h1>

      <p className="mt-2 text-sm text-cocoa-700/70">
        Compare website item codes with Tracepos item codes
        and current stock. This check does not change stock.
      </p>

      <div className="mt-6">
        <TraceposCheck />
      </div>
    </div>
  );
}