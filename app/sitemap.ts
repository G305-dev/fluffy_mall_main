import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { getProducts } from "@/lib/db";
import { getAdminCategories } from "@/lib/admin-categories";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://fluffynyummystore.com";
  const [products, categories] = await Promise.all([getProducts(), getAdminCategories()]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.4 },
    ...categories.map((c) => ({
      url: `${base}/shop/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}