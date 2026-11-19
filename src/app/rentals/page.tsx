import { getPublicRentals, getPublicRentalCategories } from "../actions/rentals-public";
import RentalsClient from "./RentalsClient";

export const revalidate = 60; // revalidate every 60 seconds

export default async function RentalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; search?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [products, categories] = await Promise.all([
    getPublicRentals(),
    getPublicRentalCategories(),
  ]);

  return (
    <RentalsClient
      initialProducts={products}
      categories={categories}
      initialCategory={resolvedParams.category}
    />
  );
}
