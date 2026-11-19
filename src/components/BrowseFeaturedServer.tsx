import { getPublicRentals } from "@/app/actions/rentals-public";
import BrowseFeatured from "./BrowseFeatured";

/**
 * Server component that fetches rental products
 * and renders the BrowseFeatured horizontal preview.
 */
export default async function BrowseFeaturedServer() {
  const products = await getPublicRentals();

  return <BrowseFeatured products={products} />;
}
