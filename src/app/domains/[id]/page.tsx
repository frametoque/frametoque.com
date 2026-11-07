import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-guard";
import { requireDomainOwnership } from "@/lib/domains/auth";

export const dynamic = "force-dynamic";

interface DirectDomainPageProps {
  params: Promise<{ id: string }>;
}

export default async function DirectDomainRedirectPage({ params }: DirectDomainPageProps) {
  const { id } = await params;
  const session = await getSessionUser();

  if (!session || !session.email) {
    redirect(`/login?redirect_url=${encodeURIComponent(`/domains/${id}`)}`);
  }

  try {
    const { domain, isAdmin } = await requireDomainOwnership(id);

    if (isAdmin) {
      redirect(`/admin/web-services/domains/${domain.id}`);
    } else {
      redirect(`/dashboard/domains/${domain.id}`);
    }
  } catch (err: any) {
    if (err.statusCode === 403 || err.message?.toLowerCase().includes("forbidden") || err.message?.toLowerCase().includes("permission")) {
      redirect("/forbidden");
    }
    // Domain not found or other non-existent identifier
    redirect("/dashboard/domains");
  }
}

