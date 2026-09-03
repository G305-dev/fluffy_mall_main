"use client";

import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/format";
import { PRIMARY_WA } from "@/lib/whatsapp";
import { usePathname } from "next/navigation";

export default function WhatsAppFloat() {
  const pathname = usePathname();
  const hasInlineWhatsAppAction = ["/product/", "/cart", "/checkout", "/order/", "/pay/"].some(
    (path) => pathname === path || pathname?.startsWith(path)
  );
  if (pathname?.startsWith("/admin") || hasInlineWhatsAppAction) return null;
  return (
    <a
      href={waLink(
        PRIMARY_WA,
        "Hello Fluffy'n'Yummy Mall! I have a question about a product."
      )}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 sm:bottom-5 sm:right-5 sm:px-4"
      aria-label="Chat with Fluffy'n'Yummy Mall on WhatsApp"
    >
      <MessageCircle size={18} />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
