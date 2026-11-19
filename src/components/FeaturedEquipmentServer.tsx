import { getPublicRentals, getPublicRentalCategories } from "@/app/actions/rentals-public";
import FeaturedEquipment from "./FeaturedEquipment";

/**
 * Server component that fetches rental equipment data
 * and renders the FeaturedEquipment client component.
 * Used on the home page to show a preview of rental gear.
 */
export default async function FeaturedEquipmentServer({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const [products, categories] = await Promise.all([
    getPublicRentals(),
    getPublicRentalCategories(),
  ]);

  return (
    <FeaturedEquipment
      products={products}
      categories={categories}
      variant={variant}
    />
  );
}
