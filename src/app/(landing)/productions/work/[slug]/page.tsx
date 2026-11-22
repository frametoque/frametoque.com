import { redirect } from "next/navigation";

export default async function ProductionsWorkSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/productions/${slug}`);
}
