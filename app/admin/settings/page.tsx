import { getSettings } from "@/lib/db";
import SettingsForm from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Store settings</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">
        Delivery fees, free-delivery thresholds and pickup discount. Test at ₦69,999 / ₦70,000 / ₦149,999 / ₦150,000.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
