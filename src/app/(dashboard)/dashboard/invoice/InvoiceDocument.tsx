import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatMoney = (value: any, currency = "") => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return "";
  const prefix = currency === "LKR" ? "LKR " : currency;
  return `${prefix} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
};

const formatMoneySlash = (value: any, currency = "") => {
  if (value === undefined || value === null || isNaN(parseFloat(value))) return "-";
  const prefix = currency === "LKR" ? "LKR " : currency;
  const suffix = currency === "LKR" ? "/-" : "";
  return `${prefix} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`.trim();
};

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  return rgb(r, g, b);
};

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

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

export async function generateInvoicePDF(invoice: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 size: 595.276 x 841.89 points
  const page = pdfDoc.addPage([595.276, 841.89]);

  // Embed fonts
  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let fontkit: any;
  if (typeof window !== "undefined" && (window as any).fontkit) {
    fontkit = (window as any).fontkit;
  } else {
    const res = await fetch("https://unpkg.com/@pdf-lib/fontkit@0.0.4/dist/fontkit.umd.js");
    const script = await res.text();
    const scriptEl = document.createElement("script");
    scriptEl.text = script;
    document.head.appendChild(scriptEl);
    fontkit = (window as any).fontkit;
  }
  if (fontkit) {
    pdfDoc.registerFontkit(fontkit);
  }


  let customFont: any;
  let customFontBold: any;

  try {
    const fontRegRes = await fetch("/fonts/BricolageGrotesque-Regular.ttf");
    const fontRegBytes = await fontRegRes.arrayBuffer();
    customFont = await pdfDoc.embedFont(fontRegBytes);

    const fontBoldRes = await fetch("/fonts/BricolageGrotesque-Bold.ttf");
    const fontBoldBytes = await fontBoldRes.arrayBuffer();
    customFontBold = await pdfDoc.embedFont(fontBoldBytes);
  } catch (e) {
    console.error("Could not load custom fonts, falling back to Helvetica", e);
    customFont = helvetica;
    customFontBold = helveticaBold;
  }

  const primaryFont = customFont || helvetica;
  const primaryFontBold = customFontBold || helveticaBold;

  // ── Background template ────────────────────────────────────────────────────
  try {
    const bgBytes = await fetchImageAsPngBytes(`/invoice.png?v=${Date.now()}`); // UPDATED to enforce PNG format and prevent caching
    const bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width: 595.276, height: 841.89 });
  } catch (error) {
    console.error("Could not load invoice background image, proceeding without background:", error);
  }

  const {
    invoice_id,
    client_name,
    billing_address,
    date,
    currency,
    subtotal,
    discount,
    advance,
    total,
    total_due,
    payment_status,
    tax_rate,
    items = [],
    bank_acc_name,
    bank_acc_number,
    bank_acc_bank,
    bank_acc_branch,
    legal_name,
    project_name,
    client
  } = invoice;

  const width     = 595.276;
  const height    = 841.89;
  const scaleX    = width  / 2480;
  const scaleY    = height / 3508;
  const scaleFont = scaleX;

  /** Convert pixel coords on the 2480×3508 template to PDF points */
  const convert = (topPx: number, leftPx: number, fontPx = 37) => ({
    x:    leftPx * scaleX,
    y:    height - topPx * scaleY,
    size: fontPx * scaleFont,
  });

  const drawTextAligned = (
    text: string,
    leftPx: number,
    topPx: number,
    fontPx: number,
    font: any,
    colorHex: string,
    align: "left" | "center" | "right" = "left",
    widthPx?: number
  ) => {
    if (!text) return;
    const { x, y, size } = convert(topPx, leftPx, fontPx);
    const yAdj  = y - size;
    const color = hexToRgb(colorHex);
    let finalX  = x;
    if (align !== "left" && widthPx !== undefined) {
      const boxW  = widthPx * scaleX;
      const textW = font.widthOfTextAtSize(text, size);
      finalX = align === "right" ? x + boxW - textW : x + (boxW - textW) / 2;
    }
    page.drawText(text, { x: finalX, y: yAdj, size, font, color });
  };

  const drawLabelValue = (label: string, value: string, leftPx: number, topPx: number, fontPx: number, font: any) => {
      if(!value) return;
      const { x, y, size } = convert(topPx, leftPx, fontPx);
      const yAdj = y - size;
      const labelW = primaryFontBold.widthOfTextAtSize(label, size);
      page.drawText(value, { x: x + labelW + (30 * scaleX), y: yAdj, size, font: font, color: hexToRgb("#222222") });
  }

  // ── 1. Top Right (Invoice No, Date, Due) ──────────────────────────────────
  const invNum = invoice_id ? `${String(invoice_id).padStart(4, "0")}` : "";
  drawTextAligned(invNum, 2080, 570, 38, primaryFont, "#222222");
  drawTextAligned(formatDate(date), 2080, 615, 38, primaryFont, "#222222");
  drawTextAligned(formatDate(invoice.due_date || date), 2080, 665, 38, primaryFont, "#222222");

  // ── 2. PREPARED FOR (Left) ────────────────────────────────────────
  if (legal_name || client_name || billing_address || client?.email) {
    const { x, y, size: nameSize } = convert(980, 150, 65);
    const detailSize = convert(980, 150, 38).size;
    const color       = hexToRgb("#222222");
    const detailSpacing = detailSize * 1.4;
    let   currentY    = y - nameSize;

    const nameToUse = legal_name || client_name || "";
    if (nameToUse) {
      page.drawText(nameToUse, { x, y: currentY, size: nameSize, font: primaryFontBold, color });
      currentY -= (nameSize * 1.15);
    }

    const emailStr = client?.email || invoice.user_email || "";
    const phoneStr = client?.phone || "";

    if (billing_address && billing_address.trim().toLowerCase() !== emailStr.toLowerCase()) {
      const parts = billing_address.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i += 2) {
         const chunk = parts.slice(i, i + 2).join(", ");
         const textToPrint = chunk + (i + 2 < parts.length ? "," : "");
         page.drawText(textToPrint, { x, y: currentY, size: detailSize, font: primaryFont, color });
         currentY -= detailSpacing;
      }
    }
    
    // Contact line
    const contactStr = [phoneStr, emailStr].filter(Boolean).join(" | ");
    if (contactStr) {
      page.drawText(contactStr, { x, y: currentY, size: detailSize, font: primaryFont, color });
      currentY -= detailSpacing;
    }
  }

  // ── 3. PROJECT (Right) ────────────────────────────────────────
  if (project_name) {
      const { x, y, size: projSize } = convert(980, 1780, 60);
      const color       = hexToRgb("#222222");
      let   currentY    = y - projSize;
      const lines = wrapText(project_name, primaryFontBold, projSize, 650 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size: projSize, font: primaryFontBold, color });
        currentY -= (projSize * 1.2);
      }
  }

  const subtotalVal = parseFloat(subtotal || 0);
  const discountVal = parseFloat(discount || 0);
  const advanceVal  = parseFloat(advance || 0);
  const taxRateVal  = parseFloat(tax_rate || 0);
  const taxAmountVal = subtotalVal * (taxRateVal / 100);
  const totalVal    = parseFloat(total || (subtotalVal + taxAmountVal - discountVal));

  const paymentsList = Array.isArray(invoice.payments) ? invoice.payments : [];
  const advancePaymentsSum = paymentsList
    .filter((p: any) => String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const otherPaymentsSum = paymentsList
    .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const totalPaymentsSum = advancePaymentsSum + otherPaymentsSum;

  const calculatedTotalDue = Math.max(0, totalVal - advancePaymentsSum);

  // ── 4. Line Items ────────────────────────────────────────────────────────────
  // 1. THIS MUST MATCH THE BACKGROUND IMAGE GRID. Do not change startRowTop.
  const startRowTop = 1534; // Mathematically calculated from the PNG template lines
  const rowHeight = 138; // The exact pixel distance between the underlines in the template
  
  // 2. Change THIS value to shift text up (-) or down (+) inside their rows.
  const visualOffsetY = 0;  
  
  const displayItems = items.length > 0 ? items : [{ description: project_name || 'Project', quantity: 1, price: subtotal, total: subtotal }];
  
  displayItems.forEach((item: any, i: number) => {
    if (!item.description) return;
    const rowTop = startRowTop + (i * rowHeight) + visualOffsetY;

    const parts = item.description.split("\n");
    
    const titleFontSize = 42;
    const subFontSize = titleFontSize * 0.75;
    const subLineHeight = subFontSize * 1.3;
    const blockHeight = titleFontSize + (parts.length - 1) * subLineHeight;
    const descTopPx = rowTop + (rowHeight - blockHeight) / 2;
    const singleLineTopPx = rowTop + (rowHeight - 42) / 2;

    // Description (Header starts at ~202)
    const { x, y, size } = convert(descTopPx, 202, titleFontSize);
    const color = hexToRgb("#222222");
    
    // DrawText naturally draws from baseline up. The convert() function gives us a Y
    // and expects us to subtract 'size' to get the baseline.
    let currentY = y - size;
    page.drawText(parts[0], { x, y: currentY, size: size, font: primaryFontBold, color });
    
    if (parts.length > 1) {
        const subSize = size * 0.75;
        // The subtitle is drawn below the title.
        // We move down by size * 0.95 in PDF points (which is our spacing).
        page.drawText(parts.slice(1).join("\n"), { 
            x, 
            y: currentY - (size * 0.95), 
            size: subSize, 
            font: primaryFont, 
            color: hexToRgb("#555555"),
            lineHeight: subSize * 1.3
        });
    }

    // QTY (Header center is ~1240 -> 1190 + 50)
    const qty = String(Number(item.quantity || item.qty) || 1).padStart(2, '0');
    drawTextAligned(qty, 1190, singleLineTopPx, 42, primaryFont, "#222222", "center", 100);

    // Unit Price (Center ~1674. Right-aligned for decimals: 1524 + 280 = 1804 edge)
    const priceVal = item.rate || item.price || 0;
    drawTextAligned(formatMoney(priceVal, currency), 1524, singleLineTopPx, 42, primaryFont, "#222222", "right", 280);

    // Total / Amount (Center ~2136. Right-aligned for decimals: 1986 + 280 = 2266 edge)
    drawTextAligned(formatMoney(item.total, currency), 1986, singleLineTopPx, 42, primaryFont, "#222222", "right", 280);
  });

  // ── 5. Totals ───────────────────────────────────────────────────────────────
  const subtotalWithTax = subtotalVal + taxAmountVal; // Invoice template only has TOTAL
  // Align right edge slightly to match the centered amount column's visual right bound
  drawTextAligned(formatMoney(subtotalWithTax, currency), 1986, 2290, 45, primaryFont, "#222222", "right", 280);
  drawTextAligned(formatMoney(discountVal, currency), 1986, 2370, 45, primaryFont, "#222222", "right", 280);
  
  // Use ONLY advance payments for ADVANCE field
  drawTextAligned(formatMoney(advancePaymentsSum, currency), 1986, 2441, 45, primaryFont, "#222222", "right", 280);
  
  // Due
  drawTextAligned(formatMoney(calculatedTotalDue, currency), 1986, 2600, 75, primaryFontBold, "#222222", "right", 280);


  // ── 6. Bank Account Details ─────────────────────────────────────────────────
  if (bank_acc_name || bank_acc_bank || bank_acc_number || bank_acc_branch) {
    const { x, y, size } = convert(3000, 150, 40);
    const color       = hexToRgb("#222222");
    let   currentY    = y - size;

    drawTextAligned(bank_acc_bank || "-", 610, 2985, 35, primaryFont, "#222222");
    drawTextAligned(bank_acc_name || "-", 610, 3025, 35, primaryFont, "#222222");
    drawTextAligned(bank_acc_number || "-", 610, 3063, 35, primaryFont, "#222222");
    
    if(bank_acc_branch) {
      drawTextAligned(bank_acc_branch, 610, 3099, 35, primaryFont, "#222222");
    }
  }

  // ── 7. PAID Stamp ────────────────────────────────────────────────────────────
  if (payment_status?.toLowerCase() === "fully paid") {
    try {
      const stampBytes = await fetchImageAsPngBytes("/paid-stamp.png");
      const stampImage = await pdfDoc.embedPng(stampBytes);

      const stampSize = 155; 
      const stampX    = width - stampSize - 38; 
      const stampY    = 65;                    

      page.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width:  stampSize,
        height: stampSize,
        rotate:  degrees(-12), 
        opacity: 0.82,        
      });
    } catch (err) {
      console.error("Could not load paid stamp image:", err);
    }
  }

  return await pdfDoc.save();
}

export default function InvoiceDocument({ invoice }: { invoice: any }) {
  return null;
}
