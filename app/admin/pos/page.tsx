import { getProducts } from "@/lib/db";
import PosWorkspace from "./PosWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminPosPage() {
  const products = await getProducts();
  return <PosWorkspace products={products} />;
}
