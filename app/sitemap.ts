import { MetadataRoute } from "next";
import { getProducts } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://fluffynyummy.com";
  const products = await getProducts();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.4 },
    ...CATEGORIES.map((c) => ({
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
