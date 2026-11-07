"use client";

import React, { use } from "react";
import { useUser } from "@clerk/nextjs";
import { DomainControlCenterView } from "@/components/services/DomainControlCenterModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminDomainDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <div className="space-y-6">
      <DomainControlCenterView
        domainId={id}
        userEmail={userEmail}
        isAdmin={true}
        isPage={true}
        backHref="/admin/web-services/domains"
      />
    </div>
  );
}

