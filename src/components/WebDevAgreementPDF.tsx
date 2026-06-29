"use client";

import React from "react";
import { AgreementData } from "@/app/(dashboard)/admin/actions/agreements";

interface WebDevAgreementPDFProps {
  agreement: AgreementData;
  onDownloadStart?: () => void;
  onDownloadEnd?: () => void;
}

export default function WebDevAgreementPDF({
  agreement,
  onDownloadStart,
  onDownloadEnd
}: WebDevAgreementPDFProps) {
  const formatLKR = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const downloadPDF = async () => {
    if (onDownloadStart) onDownloadStart();
    
    try {
      const { PDFDocument, rgb } = await import("pdf-lib");


      // Fetch the blank PDF template
      const pdfUrl = "/admin/agreements/web-dev-blank.pdf";
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to load PDF template (${pdfResponse.status})`);
      }
      
      const pdfBytes = await pdfResponse.arrayBuffer();

      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      const fieldMappings = [
        // ===== PAGE 1: PROJECT DETAILS TABLE =====
        { page: 0, field: "Agreement Date", value: formatDate(agreement.agreement_date), x: 251, y: 425 },
        { page: 0, field: "Client Name", value: agreement.client_name, x: 251, y: 405 },
        { page: 0, field: "Client Email", value: agreement.client_email, x: 251, y: 385 },
        { page: 0, field: "Client Phone", value: agreement.client_phone || "", x: 251, y: 365 },
        { page: 0, field: "Project Title", value: agreement.title, x: 251, y: 345 },
        { page: 0, field: "Start Date", value: formatDate(agreement.start_date), x: 251, y: 325 },
        { page: 0, field: "Delivery Date", value: formatDate(agreement.delivery_date), x: 251, y: 305 },
        { page: 0, field: "Content Deadline", value: formatDate(agreement.deadline), x: 251, y: 285 },

        // ===== PAGE 2: PAYMENT TERMS TABLE =====
        { page: 1, field: "Total Fee", value: formatLKR(agreement.total_fee), x: 251, y: 220 },
        { page: 1, field: "Deposit", value: formatLKR(agreement.deposit), x: 251, y: 200 },
        { page: 1, field: "UI Payment", value: formatLKR(agreement.ui_payment), x: 251, y: 180 },
        { page: 1, field: "Final Payment", value: formatLKR(agreement.final_payment), x: 251, y: 160 },
        { page: 1, field: "Payment Methods", value: agreement.payment_methods, x: 251, y: 140 },

        // ===== PAGE 3: UI REVISIONS =====
        { page: 2, field: "Revision Rounds", value: `${agreement.revision_rounds}`, x: 265, y: 460 },

        // ===== PAGE 4: HOSTING PREFERENCE & DELIVERY DATE =====
        { page: 3, field: "Hosting Preference", value: agreement.hosting_preference, x: 286, y: 397 },
        { page: 3, field: "Delivery Date", value: formatDate(agreement.delivery_date), x: 251, y: 110 },

        // ===== PAGE 6: SIGNATURES =====
        // CLIENT SIDE (left column)
        { page: 5, field: "Client Full Name", value: agreement.client_sig_name || "", x: 67, y: 584 },
        { page: 5, field: "Client Date", value: agreement.client_sig_date ? formatDate(agreement.client_sig_date) : "", x: 67, y: 482 },

        // REPRESENTATIVE SIDE (right column)
        { page: 5, field: "Rep Full Name", value: agreement.representative_name, x: 312, y: 584 },
        { page: 5, field: "Rep Date", value: formatDate(agreement.agreement_date), x: 312, y: 482 },
      ];

      // Add text to PDF
      const fontSize = 10;
      let fieldsDrawn = 0;

      for (const field of fieldMappings) {
        // Skip empty values
        if (!field.value || field.value.trim() === "") {
          continue;
        }

        // Check page exists
        if (field.page >= pages.length) {
          continue;
        }

        try {
          const page = pages[field.page];
          page.drawText(field.value, {
            x: field.x,
            y: field.y,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
          
          fieldsDrawn++;
        } catch (err) {
          console.error(`❌ Error drawing "${field.field}":`, err);
        }
      }


      // Draw client signature image if present
      if (agreement.client_sig_image) {
        try {
          const base64Content = agreement.client_sig_image.split(",")[1];
          const binaryString = window.atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          const clientSigImage = await pdfDoc.embedPng(bytes);
          const page6 = pages[5];
          page6.drawImage(clientSigImage, {
            x: 67,
            y: 523,
            width: 150,
            height: 40,
          });
          console.log("✅ Client signature drawn");
        } catch (err) {
          console.error("❌ Error drawing client signature:", err);
        }
      }

      // Draw representative signature image if present, or text fallback
      if (agreement.representative_signature) {
        const isImagePath = agreement.representative_signature.startsWith("/") || agreement.representative_signature.includes(".");
        if (isImagePath) {
          try {
            const repSigResponse = await fetch(agreement.representative_signature);
            if (repSigResponse.ok) {
              const repSigBytes = await repSigResponse.arrayBuffer();
              const repSigImage = await pdfDoc.embedPng(repSigBytes);
              const page6 = pages[5];
              page6.drawImage(repSigImage, {
                x: 312,
                y: 515,
                width: 160,
                height: 74,
              });
            } else {
              console.error(`❌ Failed to fetch rep signature: ${repSigResponse.status}`);
            }
          } catch (err) {
            console.error("❌ Error drawing representative signature image:", err);
          }
        } else {
          // Draw as text fallback
          try {
            const page6 = pages[5];
            page6.drawText(agreement.representative_signature, {
              x: 382,
              y: 380,
              size: fontSize + 2,
              color: rgb(0, 0, 0),
            });
          } catch (err) {
            console.error("❌ Error drawing representative signature text:", err);
          }
        }
      }

      // Save and download the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      const blob = new Blob([filledPdfBytes] as any, { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${agreement.title.replace(/\s+/g, "_")}_Web_Development_Agreement.pdf`;
      
      link.click();
      URL.revokeObjectURL(link.href);
      
    } catch (err) {
      alert(`Failed to export PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (onDownloadEnd) onDownloadEnd();
    }
  };

  // Expose download trigger globally
  if (typeof window !== "undefined") {
    (window as any).triggerAgreementDownload = downloadPDF;
  }

  return null;
}