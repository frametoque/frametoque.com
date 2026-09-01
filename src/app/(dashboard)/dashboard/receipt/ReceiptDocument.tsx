import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function fetchImageAsPngBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await res.blob();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      const binaryStr = window.atob(base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      resolve(bytes.buffer);
    };
    img.onerror = () => reject(new Error("Failed to load image into canvas"));
    img.src = URL.createObjectURL(blob);
  });
}

export async function generateReceiptPDF(receiptData: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const width = 595.276;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const scaleX = width / 2480;
  const scaleY = height / 3508;
  const scaleFont = scaleX;

  const convert = (topPx: number, leftPx: number, fontPx = 37) => ({
    x: leftPx * scaleX,
    y: height - topPx * scaleY,
    size: fontPx * scaleFont,
  });

  const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const num = parseInt(hex, 16);
    return rgb((num >> 16) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
  };

  const drawTextAligned = (
    text: string,
    leftPx: number,
    topPx: number,
    fontPx: number,
    font: any,
    colorHex: string,
    align: "left" | "right" | "center" = "left"
  ) => {
    if (!text) return;
    const { x, y, size } = convert(topPx, leftPx, fontPx);
    const textWidth = font.widthOfTextAtSize(text, size);
    
    let finalX = x;
    if (align === "right") finalX = x - textWidth;
    else if (align === "center") finalX = x - (textWidth / 2);
    
    page.drawText(text, { x: finalX, y, size, font, color: hexToRgb(colorHex) });
  };

  let fontkit: any;
  if (typeof window !== "undefined" && (window as any).fontkit) {
    fontkit = (window as any).fontkit;
  } else {
    const res = await fetch("https://unpkg.com/@pdf-lib/fontkit@0.0.4/dist/fontkit.umd.js");
    const script = await res.text();
    const scriptEl = document.createElement("script");
    scriptEl.text = script;
    document.head.appendChild(scriptEl);
    
    // Wait for the script to be evaluated
    await new Promise((resolve) => setTimeout(resolve, 100));
    fontkit = (window as any).fontkit;
  }
  
  if (fontkit) {
    pdfDoc.registerFontkit(fontkit);
  }

  let primaryFont, primaryFontBold;
  try {
    const fontRegRes = await fetch("/fonts/BricolageGrotesque-Regular.ttf");
    const fontRegBytes = await fontRegRes.arrayBuffer();
    primaryFont = await pdfDoc.embedFont(fontRegBytes);

    const fontBoldRes = await fetch("/fonts/BricolageGrotesque-Bold.ttf");
    const fontBoldBytes = await fontBoldRes.arrayBuffer();
    primaryFontBold = await pdfDoc.embedFont(fontBoldBytes);
  } catch (err) {
    console.warn("Could not load custom fonts, using Helvetica fallback.");
    primaryFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    primaryFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  let bgImage: any = null;
  try {
    const bgBytes = await fetchImageAsPngBytes("/Reciept.png");
    bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width, height });
  } catch (err) {
    console.error("Failed to load background template Reciept.png", err);
  }

  const { income, invoice, client, account } = receiptData;
  const { amount, date, method, id: incomeId } = income || {};
  const description = income?.description || income?.desc || "";
  const { invoice_id, project_name, currency = 'LKR', total, tax_rate, discount, subtotal, total_due, legal_name, client_name, billing_address, work_status } = invoice || {};
  const { full_name, email, phone, address, company } = client || {};

  const formatMoney = (val: number | string | undefined | null, curr: string) => {
    const v = parseFloat(val as string) || 0;
    const prefix = (curr || 'LKR') === "LKR" ? "LKR " : (curr || 'LKR') + " ";
    const formatted = v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${prefix}${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  // 1. Top Right
  const recNum = incomeId ? `REC-${String(incomeId).padStart(5, "0")}` : "";
  const invoiceRef = invoice_id ? String(invoice_id) : "";
  drawTextAligned(recNum, 2095, 610, 38, primaryFont, "#222222");
  drawTextAligned(formatDate(date), 2095, 655, 38, primaryFont, "#222222");
  drawTextAligned(invoiceRef, 2095, 700, 38, primaryFont, "#222222");

  // Calculate Due
  const taxRateVal  = parseFloat(tax_rate || 0);
  const discountVal = parseFloat(discount || 0);
  const subtotalVal = parseFloat(subtotal || 0);
  const totalVal    = parseFloat(total || (subtotalVal + (subtotalVal * taxRateVal / 100) - discountVal));
  
  const paymentsList = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const totalPaymentsSum = paymentsList.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  let finalDue = parseFloat(total_due != null ? total_due : (totalVal - totalPaymentsSum));
  finalDue = Math.max(0, finalDue);

  // 2. RECEIVED BY (Left)
  const nameToUse = company || legal_name || full_name || client_name || invoice?.user_email || "";
  const addressToUse = address || billing_address || "";
  const emailToUse = email || invoice?.user_email || "";

  const { x: xl, y: yl, size: sizel } = convert(980, 150, 42);
  let currentY = yl - sizel;
  const color = hexToRgb("#222222");
  const lineSpacing = sizel * 1.4;

  if (nameToUse) {
    page.drawText(nameToUse, { x: xl, y: currentY, size: sizel, font: primaryFontBold, color });
    currentY -= (sizel * 1.2);
  }

  if (addressToUse) {
    const parts = addressToUse.split(",").map((s: string) => s.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i += 2) {
       const chunk = parts.slice(i, i + 2).join(", ");
       const textToPrint = chunk + (i + 2 < parts.length ? "," : "");
       page.drawText(textToPrint, { x: xl, y: currentY, size: sizel * 0.9, font: primaryFont, color });
       currentY -= lineSpacing * 0.9;
    }
  }

  if (emailToUse) {
    page.drawText(emailToUse, { x: xl, y: currentY, size: sizel * 0.9, font: primaryFont, color });
  }

  // 3. PROJECT (Right)
  const { x: xr, y: yr, size: sizer } = convert(980, 1780, 42);
  let rightY = yr - sizer;

  if (project_name) {
    page.drawText(project_name, { x: xr, y: rightY, size: sizer, font: primaryFontBold, color });
    rightY -= (sizer * 1.5);
  }
  
  let paymentType = "Partial Payment";
  if (String(description || '').toLowerCase().startsWith('advance')) {
    paymentType = "Advance Payment";
  } else if (finalDue <= 0) {
    paymentType = "Full Payment";
  }

  // Draw values only, aligned with the template's built-in labels
  // X: ~2050 to be to the right of the colon
  // Y: ~1315 for Payment Type, ~1380 for Status
  drawTextAligned(paymentType, 2050, 1175, 38, primaryFont, "#222222");
  drawTextAligned(work_status || 'In Progress', 2050, 1240, 38, primaryFont, "#222222");

  // 4. AMOUNT RECEIVED & Deposited To
  const amountStr = formatMoney(amount, currency);
  drawTextAligned(amountStr, 150, 1600, 120, primaryFontBold, "#222222");
  
  // Use specific account details from income if available, otherwise invoice default
  const act = account || invoice; 
  if (act) {
    // try account properties or fallback to invoice properties
    const accName = act.name || act.bank_acc_name || '';
    const accNum = act.account_number || act.bank_acc_number || '';
    const bName = act.bank_name || act.bank_acc_bank || '';
    const branch = act.branch || act.bank_acc_branch || '';
    
    const partsLeft = [accName, accNum].filter(Boolean).join(" - ");
    const partsRight = [bName, branch].filter(Boolean).join(" - ");
    
    let bankDetails = "";
    if (partsLeft && partsRight) {
      bankDetails = `${partsLeft} | ${partsRight}`;
    } else if (partsLeft) {
      bankDetails = partsLeft;
    } else if (partsRight) {
      bankDetails = partsRight;
    }

    if (bankDetails) {
      drawTextAligned(bankDetails, 150, 1770, 38, primaryFont, "#222222");
    }
  }

  // 5. Table
  drawTextAligned("Total Project Value", 190, 2150, 42, primaryFont, "#222222");
  drawTextAligned(formatMoney(totalVal, currency), 2280, 2150, 42, primaryFont, "#222222", "right");

  if (description) {
    drawTextAligned(`Payment Received: ${description}`, 190, 2200, 42, primaryFont, "#222222");
    drawTextAligned(`- ${formatMoney(amount, currency)}`, 2280, 2200, 42, primaryFont, "#222222", "right");
  }

  // 6. DUE
  drawTextAligned(formatMoney(finalDue, currency), 2300, 2565, 70, primaryFontBold, "#222222", "right");

  return await pdfDoc.save();
}
