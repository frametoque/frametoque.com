import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value: any, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "";
  const prefix = currency === "LKR" ? "Rs." : currency;
  return `${prefix} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
};

const formatMoneySlash = (value: any, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "-";
  const prefix = currency === "LKR" ? "Rs." : currency;
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

export async function generateInvoicePDF(invoice: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 size: 595.276 x 841.89 points
  const page = pdfDoc.addPage([595.276, 841.89]);

  // Embed fonts
  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Background template ────────────────────────────────────────────────────
  try {
    const bgResponse = await fetch("/invoice.png");
    if (!bgResponse.ok) throw new Error(`Failed to fetch /invoice.png: ${bgResponse.statusText}`);
    const bgBytes = await bgResponse.arrayBuffer();
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

  // ── 1. Invoice Number ────────────────────────────────────────────────────────
  drawTextAligned(invoice_id || "", 1942, 473, 40, helveticaBold, "#1a3a4a");

  // ── 2. Billing Address ────────────────────────────────────────
  if (legal_name || billing_address) {
    const { x, y, size } = convert(940, 130, 45);
    const color       = hexToRgb("#1a3a4a");
    const lineSpacing = size * 1.35;
    let   currentY    = y - size;

    if (legal_name) {
      page.drawText(legal_name, { x, y: currentY, size, font: helveticaBold, color });
      currentY -= lineSpacing;
    }
    if (billing_address) {
      const lines = wrapText(billing_address, helveticaBold, size, 470 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: helveticaBold, color });
        currentY -= lineSpacing;
      }
    }
  }

  // ── 3. Date ──────────────────────────────────────────────────────────────────
  drawTextAligned(formatDate(date), 930, 842, 46, helvetica, "#222222");

  const subtotalVal = parseFloat(subtotal || 0);
  const discountVal = parseFloat(discount || 0);
  const advanceVal  = parseFloat(advance || 0);
  const taxRateVal  = parseFloat(tax_rate || 0);
  const taxAmountVal = subtotalVal * (taxRateVal / 100);
  const totalVal    = parseFloat(total || (subtotalVal + taxAmountVal - discountVal));

  const paymentsList = Array.isArray(invoice.payments) ? invoice.payments : [];
  const totalPaymentsVal = paymentsList
    .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  const calculatedTotalDue = total_due !== undefined && total_due !== null
    ? parseFloat(total_due)
    : Math.max(0, totalVal - advanceVal - totalPaymentsVal);

  // ── 4. Total Due ─────────────────────────────────────────────────────────────
  drawTextAligned(
    formatMoney(calculatedTotalDue, currency),
    769, 955, 70, helveticaBold, "#1a3a4a"
  );

  // ── 5. Line Items ────────────────────────────────────────────────────────────
  const rowTops = [1470, 1645, 1820, 1995];
  items.forEach((item: any, i: number) => {
    if (!item.description) return;
    const rowTop = rowTops[i] ?? (1470 + i * 175);

    // Description
    const { x, y, size } = convert(rowTop, 875, 37);
    const color           = hexToRgb("#222222");
    const descLines       = wrapText(item.description, helvetica, size, (1525 - 875 - 30) * scaleX);
    let   descY           = y - size;
    const descLineSpacing = size * 1.35;
    descLines.forEach((line) => {
      page.drawText(line, { x, y: descY, size, font: helvetica, color });
      descY -= descLineSpacing;
    });

    // Price
    let priceText = "-";
    if (item.price) {
      const formattedPrice = `${currency === "LKR" ? "Rs." : currency} ${item.price}`;
      const qty = Number(item.quantity || item.qty) || 1;
      priceText = `${qty} x ${formattedPrice}`;
    }
    drawTextAligned(priceText, 1525, rowTop, 37, helvetica, "#222222", "center", 439);

    // Total
    drawTextAligned(formatMoney(item.total, currency), 1700, rowTop, 37, helvetica, "#222222", "right", 562);
  });

  // ── 6. Subtotal ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(subtotal, currency), 1640, 2225, 45, helvetica, "#222222", "right", 649);

  // ── 7. Discount ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(discount, currency), 1640, 2300, 45, helvetica, "#222222", "right", 649);

  // ── 8. Advance ────────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(advance, currency), 1640, 2390, 45, helvetica, "#222222", "right", 649);

  // ── 8.5. Tax ──────────────────────────────────────────────────────────────────
  if (taxRateVal > 0) {
    const taxAmount = parseFloat(subtotal || 0) * (taxRateVal / 100);
    drawTextAligned(`Tax (${taxRateVal}%)`, 1450, 2475, 45, helvetica, "#222222", "center", 440);
    drawTextAligned(formatMoneySlash(taxAmount, currency), 1640, 2475, 45, helvetica, "#222222", "right", 649);
  }

  // ── 9. Total ──────────────────────────────────────────────────────────────────
  drawTextAligned(formatMoney(total, currency), 1600, 2560, 60, helveticaBold, "#1a3a4a", "right", 649);

  // ── 10. Bank Account Details ─────────────────────────────────────────────────
  if (bank_acc_name || bank_acc_bank || bank_acc_number || bank_acc_branch) {
    const { x, y, size } = convert(1750, 135, 45);
    const color       = hexToRgb("#1a3a4a");
    const lineSpacing = size * 1.35;
    let   currentY    = y - size;

    if (bank_acc_name) {
      page.drawText(bank_acc_name, { x, y: currentY, size, font: helveticaBold, color });
      currentY -= lineSpacing;
    }
    if (bank_acc_bank) {
      const lines = wrapText(bank_acc_bank, helveticaBold, size, 640 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: helveticaBold, color });
        currentY -= lineSpacing;
      }
    }
    if (bank_acc_number) {
      const lines = wrapText(bank_acc_number, helveticaBold, size, 640 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: helveticaBold, color });
        currentY -= lineSpacing;
      }
    }
    if (bank_acc_branch) {
      const lines = wrapText(bank_acc_branch, helveticaBold, size, 640 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: helveticaBold, color });
        currentY -= lineSpacing;
      }
    }
  }

  // ── 11. PAID Stamp ────────────────────────────────────────────────────────────
  if (payment_status === "fully paid") {
    try {
      const stampResponse = await fetch("/paid-stamp.png");
      if (!stampResponse.ok) throw new Error("Stamp not found");
      const stampBytes = await stampResponse.arrayBuffer();
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