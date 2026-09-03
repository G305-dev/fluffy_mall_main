import { getProductBySlug, getProducts } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductView from "./ProductView";
import ProductCard from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.short,
    openGraph: {
      title: product.name,
      description: product.short,
      images: product.images,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = (await getProducts())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div>
      <ProductView product={product} />
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
          <h2 className="font-display text-2xl text-cocoa-800">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
