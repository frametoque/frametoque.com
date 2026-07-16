"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, MessageCircle, Sparkles, UserCheck, FilePenLine, CreditCard } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import PayModal from "@/components/PayModal";

import RecentProjectsWidget from "./projects/RecentProjectsWidget";
import RecentQuotationsWidget from "./quotations/RecentQuotationsWidget";
import { getAgreementsByClient, AgreementData } from "../admin/actions/agreements";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();

  const [progress, setProgress] = useState(100);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [unsignedAgreements, setUnsignedAgreements] = useState<AgreementData[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(true);

  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/users/get-profile?userId=${user.id}`);
        const json = await res.json();

        if (json.success) {
          const p = json.profile || {};

          const finalData = {
            fullName: p.fullName || user.fullName || "",
            email: p.email || user?.primaryEmailAddress?.emailAddress || "",
            phone: p.phone || "",
            company: p.company || "",
            website: p.website || "",
            address: p.address || "",
          };

          const required = [
            { key: "fullName", label: "Full Name" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "address", label: "Address" },
          ];

          const missingRequired = required
            .filter((f) => !finalData[f.key as keyof typeof finalData] || finalData[f.key as keyof typeof finalData].trim() === "")
            .map((f) => f.label);

          setMissingFields(missingRequired);

          const filledCount = required.length - missingRequired.length;
          const progressPercent = Math.round((filledCount / required.length) * 100);

          setProgress(progressPercent);
        }
      } catch (e) {
        console.error("ProfileProgress error:", e);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
      const email = user.primaryEmailAddress.emailAddress;
      const fetchClientAgreements = async () => {
        try {
          setLoadingAgreements(true);
          const data = await getAgreementsByClient(email);
          const pendingAgreements = data.filter((a) => a.status === "pending");
          setUnsignedAgreements(pendingAgreements);
        } catch (err) {
          console.error("Failed to load client agreements:", err);
        } finally {
          setLoadingAgreements(false);
        }
      };
      fetchClientAgreements();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
      const email = user.primaryEmailAddress.emailAddress;
      const fetchUnpaidInvoices = async () => {
        try {
          setLoadingInvoices(true);
          const response = await fetch(`/api/requests?user_email=${encodeURIComponent(email)}`);
          if (response.ok) {
            const data = await response.json();
            const unpaid = data.filter(
              (r: any) => 
                r.invoice_number && 
                r.invoice_number !== "null" && 
                r.total_due > 0 &&
                r.payment_status !== "fully paid" &&
                r.payment_status !== "paid"
            );
            setUnpaidInvoices(unpaid);
          }
        } catch (err) {
          console.error("Failed to load unpaid invoices:", err);
        } finally {
          setLoadingInvoices(false);
        }
      };
      fetchUnpaidInvoices();
    }
  }, [isLoaded, user]);

  const quickActions = [
    {
      href: "/services",
      icon: ShoppingCart,
      label: "Browse Services",
      className:
        "flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-3xl font-semibold hover:opacity-90 transition-opacity",
    },
    {
      href: "/contact",
      icon: MessageCircle,
      label: "Contact Us",
      className:
        "flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/20 text-white rounded-3xl font-semibold hover:bg-white/20 transition-all duration-300",
    },
  ];

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Welcome & Profile Section */}
      <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <div className={`grid grid-cols-1 ${progress < 100 && !loadingProfile ? "lg:grid-cols-3" : "grid-cols-1"} gap-8 items-center`}>
          {/* Greeting Column */}
          <div className={progress < 100 && !loadingProfile ? "lg:col-span-2" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-brand-400" />
              <span className="text-brand-400 font-semibold">{getGreeting()}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Welcome back,&nbsp;
              </span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                {user?.firstName || user?.fullName || "there"}!
              </span>
            </h1>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl">
              Your one-stop solution for stunning websites, graphic, and videos.&nbsp;
              Explore our services and let's bring your vision to life!
            </p>

            <div className="flex flex-wrap gap-4">
              {quickActions.map((action, idx) => {
                const IconComponent = action.icon;
                return (
                  <Link key={idx} href={action.href} className={action.className}>
                    <IconComponent className="w-5 h-5" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Profile Progress Column */}
          {progress < 100 && !loadingProfile && (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-brand-400" />
                  <span className="text-brand-400 font-semibold text-sm">Profile Status</span>
                </div>

                <h2 className="text-base font-bold text-white mb-2">
                  Let's complete your profile!
                </h2>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1 text-xs text-gray-300">
                    <span>Completion</span>
                    <span className="text-brand-400 font-semibold">{progress}%</span>
                  </div>

                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {missingFields.length > 0 && (
                  <p className="text-xs text-gray-400 mb-4">
                    Required:
                    <span className="text-gray-200"> {missingFields.join(", ")}</span>
                  </p>
                )}
              </div>

              <Link
                href="/dashboard/settings"
                className="inline-block text-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-3xl transition-all"
              >
                Complete Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Agreement Alert Widget */}
      {!loadingAgreements && unsignedAgreements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-brand-500/10 border border-amber-500/20 backdrop-blur-xl rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
              <FilePenLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {unsignedAgreements.length === 1 
                  ? "Agreement Pending Signature" 
                  : `${unsignedAgreements.length} Agreements Pending Signature`}
              </h3>
              <p className="text-sm text-gray-300 max-w-xl">
                {unsignedAgreements.length === 1
                  ? `Please review and sign the "${unsignedAgreements[0].title}" to get started on your project.`
                  : "Please review and sign the outstanding service agreements to begin work on your projects."}
              </p>
            </div>
          </div>
          <Link
            href={
              unsignedAgreements.length === 1 
                ? `/dashboard/agreements/${unsignedAgreements[0].id}` 
                : "/dashboard/agreements"
            }
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold rounded-3xl text-sm transition-all shadow-lg shadow-amber-500/10"
          >
            Review & Sign
          </Link>
        </div>
      )}

      {/* Unpaid Invoices Alert Widget */}
      {!loadingInvoices && unpaidInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-brand-500/10 border border-blue-500/20 backdrop-blur-xl rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {unpaidInvoices.length === 1 
                  ? "Outstanding Invoice Pending Payment" 
                  : `${unpaidInvoices.length} Outstanding Invoices Pending Payment`}
              </h3>
              <p className="text-sm text-gray-300 max-w-xl">
                {unpaidInvoices.length === 1
                  ? `You have a pending invoice for "${unpaidInvoices[0].title}" of Rs. ${unpaidInvoices[0].total_due.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`
                  : `You have ${unpaidInvoices.length} pending invoices to pay. Please review them to settle your project due balances.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            {unpaidInvoices.length === 1 ? (
              <button
                onClick={() => {
                  setSelectedInvoice({
                    invoice_id: unpaidInvoices[0].invoice_number,
                    project_name: unpaidInvoices[0].title,
                    total_due: unpaidInvoices[0].total_due,
                    currency: unpaidInvoices[0].currency,
                  });
                  setIsPayModalOpen(true);
                }}
                className="flex-1 sm:flex-initial text-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-3xl text-sm transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                Pay Now
              </button>
            ) : (
              <Link
                href="/dashboard/projects"
                className="flex-1 sm:flex-initial text-center px-5 py-2.5 bg-zinc-900 border border-white/10 hover:bg-white/5 text-white font-bold rounded-3xl text-sm transition-all"
              >
                View & Pay Invoices
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Projects and Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentProjectsWidget />
        <RecentQuotationsWidget />
      </div>

      {/* Pay Modal */}
      <PayModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
