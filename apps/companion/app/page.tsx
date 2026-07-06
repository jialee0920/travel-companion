import { HomeClient } from '@/components/HomeClient';
import { listProducts } from '@/lib/db/products';

export default async function HomePage() {
  const products = await listProducts();
  return <HomeClient products={products} />;
}
