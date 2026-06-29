"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Download, Send, RefreshCw, PenTool, CheckCircle2, Loader2, Calendar, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getAgreementById, signAgreement, AgreementData } from "../../../admin/actions/agreements";
import WebDevAgreementPDF from "@/components/WebDevAgreementPDF";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export default function ClientAgreementViewPage() {
  const router = useRouter();
  const { agreement_id } = useParams();
  const { user, isLoaded: userLoaded } = useUser();

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Signature Form States
  const [clientSigName, setClientSigName] = useState("");
  const [clientSigDate, setClientSigDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingSig, setSubmittingSig] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const data = await getAgreementById(parseInt(agreement_id as string));
      if (!data) throw new Error("Agreement not found");
      
      // Security check: ensure client email matches logged-in user
      if (userLoaded && user?.primaryEmailAddress?.emailAddress) {
        if (data.client_email.toLowerCase() !== user.primaryEmailAddress.emailAddress.toLowerCase()) {
          throw new Error("You do not have permission to view this agreement");
        }
      }

      setAgreement(data);
      if (data.client_name) setClientSigName(data.client_name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load agreement details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoaded) {
      fetchAgreement();
    }
  }, [agreement_id, userLoaded]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e, canvas);
    if (!coords) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000"; // Black ink for high contrast on white PDF
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e, canvas);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmitSignature = async () => {
    if (!clientSigName.trim()) {
      alert("Please enter your Full Name.");
      return;
    }
    if (!hasDrawn) {
      alert("Please draw your signature in the signing area.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmittingSig(true);
    try {
      // 1. Get base64 PNG from canvas
      // In Neon, client_sig_image is stored as base64 string
      const sigBase64 = canvas.toDataURL("image/png");

      // 2. Trigger Server Action
      await signAgreement(
        parseInt(agreement_id as string),
        clientSigName,
        clientSigDate,
        sigBase64
      );

      // 3. Reload agreement details
      await fetchAgreement();
      alert("Agreement signed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit signature.");
    } finally {
      setSubmittingSig(false);
    }
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      if ((window as any).triggerAgreementDownload) {
        (window as any).triggerAgreementDownload();
      }
      setDownloading(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        <span>Loading agreement details...</span>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/agreements" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Agreements
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
          <p className="text-red-400 font-semibold">{error || "Failed to find agreement"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agreements" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{agreement.title}</h1>
            <p className="text-xs text-gray-500 mt-1">Agreement ID: AGR-{agreement.id}</p>
          </div>
        </div>

        {agreement.status === "signed" && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Signed PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Contract content web view */}
        <div className="lg:col-span-2 space-y-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 max-h-[80vh] overflow-y-auto shadow-2xl">
          {/* Cover Header */}
          <div className="border-b border-white/10 pb-6 mb-6 text-center md:text-left">
            <h2 className="text-xs font-bold tracking-wider text-brand-400 uppercase">Agreement Document</h2>
            <h3 className="text-2xl font-bold text-white mt-1">{agreement.title}</h3>
            <p className="text-sm text-gray-400 mt-1">Between FrameToque Digital Media and {agreement.client_name}</p>
          </div>

          {/* Web Preview Content */}
          <div className="text-sm text-gray-300 space-y-6 leading-relaxed">
            <div>
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">Preamble</h4>
              <p>
                This Website Development Agreement ("Agreement") is entered into between FrameToque Digital Media 
                ("FrameToque," "Service Provider," "we," or "our") and the undersigned client ("Client," "you," or "your"). By 
                commissioning web development services from FrameToque, the Client acknowledges that they have read, 
                understood, and agreed to all terms and conditions outlined in this Agreement.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">Project Details</h4>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <p><span className="text-gray-400">Agreement Date:</span> <span className="font-semibold text-white">{formatDate(agreement.agreement_date)}</span></p>
                <p><span className="text-gray-400">Client Name:</span> <span className="font-semibold text-white">{agreement.client_name}</span></p>
                <p><span className="text-gray-400">Client Email:</span> <span className="font-semibold text-white">{agreement.client_email}</span></p>
                <p><span className="text-gray-400">Client Phone:</span> <span className="font-semibold text-white">{agreement.client_phone || "—"}</span></p>
                <p><span className="text-gray-400">Start Date:</span> <span className="font-semibold text-white">{formatDate(agreement.start_date)}</span></p>
                <p><span className="text-gray-400">Est. Delivery Date:</span> <span className="font-semibold text-white">{formatDate(agreement.delivery_date)}</span></p>
                <p><span className="text-gray-400">Content Deadline:</span> <span className="font-semibold text-white">{formatDate(agreement.deadline)}</span></p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">1. Project Scope</h4>
              <p>
                FrameToque agrees to design and develop a website as described and agreed upon during the initial 
                consultation and project brief. The project scope covers only the features, pages, and functionalities explicitly 
                agreed upon in writing.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">2. Timeline & Content Responsibility</h4>
              <p>
                The project timeline is dependent on the timely cooperation of both parties. The Client must provide all required content 
                (including text copy, images, logos, brand assets) by the Content Submission Deadline. Delays caused by late content 
                delivery or delayed approvals will push the delivery date back accordingly.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">3. Payment Terms</h4>
              <p className="mb-3">
                The total project fee is structured across three stages:
              </p>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
                <p className="flex justify-between"><span>Total Project Fee:</span> <span className="font-bold text-white text-base">{formatLKR(agreement.total_fee)}</span></p>
                <p className="flex justify-between"><span>Stage 1: Deposit (50%):</span> <span className="font-semibold text-white">{formatLKR(agreement.deposit)}</span></p>
                <p className="flex justify-between"><span>Stage 2: UI Approval (25%):</span> <span className="font-semibold text-white">{formatLKR(agreement.ui_payment)}</span></p>
                <p className="flex justify-between"><span>Stage 3: Final Delivery (25%):</span> <span className="font-semibold text-white">{formatLKR(agreement.final_payment)}</span></p>
                <p className="flex justify-between"><span>Payment Methods:</span> <span className="font-semibold text-white">{agreement.payment_methods}</span></p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">4. Development Process & Revisions</h4>
              <p>
                The project follows a stage-gated workflow. The Client is entitled to <span className="text-brand-400 font-semibold">{agreement.revision_rounds} included revision rounds</span> during the UI design phase. Additional revisions or major layout changes requested after coding has commenced will incur additional fees.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">5. Hosting & Support</h4>
              <p className="mb-2">
                Hosting Preference Selected: <span className="text-brand-400 font-semibold">{agreement.hosting_preference}</span>
              </p>
              <p>
                A free support period of 3 months covering up to 3 minor modifications is included. Support ends on {
                  (() => {
                    if (!agreement.delivery_date) return "—";
                    const d = new Date(agreement.delivery_date);
                    d.setMonth(d.getMonth() + 3);
                    return formatDate(d.toISOString().split("T")[0]);
                  })()
                }.
              </p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-white font-bold text-base mb-2 uppercase tracking-wide">6. Governing Law & Intellectual Property</h4>
              <p>
                Upon full payment, the Client owns the final delivered website. This Agreement is governed by the laws of the Democratic Socialist Republic of Sri Lanka.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Signing card or signature display */}
        <div className="space-y-6">
          {agreement.status !== "signed" ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <PenTool className="w-5 h-5 text-brand-400" />
                <h2 className="text-xl font-bold text-white">Sign Agreement</h2>
              </div>
              <p className="text-xs text-gray-400">
                Please review all contract details on the left. Draw your digital signature in the box and enter your name to complete the signing.
              </p>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Your Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  required
                  onChange={e => setClientSigName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Signature Date</label>
                <input
                  type="date"
                  value={clientSigDate}
                  onChange={e => setClientSigDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm text-white-400"
                  readOnly
                />
              </div>

              {/* Drawing Board Canvas */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400">Draw Signature</label>
                  <button 
                    onClick={clearCanvas}
                    className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    Clear pad
                  </button>
                </div>
                
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full block"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmitSignature}
                disabled={submittingSig}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-3xl font-semibold transition-colors mt-2"
              >
                {submittingSig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sign & Proceed
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-950/40 to-black border border-green-500/20 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Agreement Signed</h3>
                <p className="text-xs text-gray-400 mt-1">This agreement is legally binding</p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-left space-y-2">
                <p className="text-gray-400">Signed By: <span className="font-semibold text-white">{agreement.client_sig_name}</span></p>
                <p className="text-gray-400">Date Signed: <span className="font-semibold text-white">{formatDate(agreement.client_sig_date || "")}</span></p>
                
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 mb-1">Your Digital Signature:</p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-center h-[60px]">
                    <img 
                      src={agreement.client_sig_image || ""} 
                      alt="Signature" 
                      className="max-h-[50px] object-contain invert brightness-200"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-3xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                ) : (
                  <Download className="w-4 h-4 text-brand-400" />
                )}
                Download Copy (PDF)
              </button>
            </div>
          )}

          {/* Representative Signature Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white font-sans">Representative Details</h2>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-left space-y-2 font-sans">
              <p className="text-gray-400">Representative: <span className="font-semibold text-white">{agreement.representative_name}</span></p>
              <p className="text-gray-400">Date Signed: <span className="font-semibold text-white">{formatDate(agreement.agreement_date)}</span></p>
              
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-gray-500 mb-1">Signature:</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-center h-[60px] overflow-hidden">
                  {agreement.representative_signature && (agreement.representative_signature.startsWith("/") || agreement.representative_signature.includes(".")) ? (
                    <img 
                      src={agreement.representative_signature} 
                      alt="Representative Signature" 
                      className="max-h-[50px] object-contain brightness-200"
                    />
                  ) : (
                    <span 
                      style={{ fontFamily: "'Brush Script MT', cursive, Georgia, serif" }}
                      className="italic text-xl text-cyan-400"
                    >
                      {agreement.representative_signature || agreement.representative_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded hidden PDF rendering component */}
      {agreement && (
        <WebDevAgreementPDF 
          agreement={agreement} 
          onDownloadStart={() => {}}
          onDownloadEnd={() => {}}
        />
      )}
    </div>
  );
}
