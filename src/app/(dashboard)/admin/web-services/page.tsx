import { redirect } from "next/navigation";

export default async function WebServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === "hosting") {
    redirect("/admin/web-services/hosting");
  } else if (tab === "credentials") {
    redirect("/admin/web-services/credentials");
  }
  redirect("/admin/web-services/domains");
}
