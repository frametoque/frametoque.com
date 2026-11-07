"use client";

import React, { use } from "react";
import { useUser } from "@clerk/nextjs";
import { DomainControlCenterView } from "@/components/services/DomainControlCenterModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDomainDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <div className="w-full space-y-6">
      <DomainControlCenterView
        domainId={id}
        userEmail={userEmail}
        isAdmin={false}
        isPage={true}
        backHref="/dashboard/domains"
      />
    </div>
  );
}

