import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
};

const wrapText = (text: string, font: any, fontSize: number, maxWidth: number) => {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

export async function generateQuotationPDF(quotation: any) {
  const pdfDoc = await PDFDocument.create();

  // A4 size: 595.276 x 841.89 points
  const page = pdfDoc.addPage([595.276, 841.89]);

  // Embed fonts
  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Background template ────────────────────────────────────────────────────
  try {
    const bgResponse = await fetch("/quotation.png");
    if (!bgResponse.ok) throw new Error(`Failed to fetch /quotation.png: ${bgResponse.statusText}`);
    const bgBytes = await bgResponse.arrayBuffer();
    const bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width: 595.276, height: 841.89 });
  } catch (error) {
    console.error("Could not load quotation background image, proceeding without background:", error);
  }

  const {
    id,
    client_name,
    billing_address,
    date,
    currency = "LKR",
    amount,
    discount = 0,
    advance = 0,
    items = [],
    bank_acc_name,
    bank_acc_number,
    bank_acc_bank,
    bank_acc_branch,
    notes,
  } = quotation;

  const discountVal = parseFloat(discount || 0);
  const total = parseFloat(amount || 0);
  const subtotal = total + discountVal;
  const advanceVal = parseFloat(advance || 0);
  const totalDue = total - advanceVal;

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

  // ── 1. Quotation Number ────────────────────────────────────────────────────────
  const quoteNum = `QT-${String(id).padStart(5, "0")}`;
  drawTextAligned(quoteNum, 1942, 473, 40, helveticaBold, "#1a3a4a");

  // ── 2. Client Name + Billing Address ────────────────────────────────────────
  if (client_name || billing_address) {
    const { x, y, size } = convert(940, 130, 45);
    const color       = hexToRgb("#1a3a4a");
    const lineSpacing = size * 1.35;
    let   currentY    = y - size;

    if (client_name) {
      page.drawText(client_name, { x, y: currentY, size, font: helveticaBold, color });
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

  // ── 4. Total Due ─────────────────────────────────────────────────────────────
  drawTextAligned(
    formatMoney(totalDue, currency),
    769, 955, 70, helveticaBold, "#1a3a4a"
  );

  // ── 5. Line Items ────────────────────────────────────────────────────────────
  const rowTops = [1470, 1645, 1820, 1995];
  
  const displayItems = items.length > 0 ? items : [{ description: quotation.description || 'Project', quantity: 1, rate: subtotal, total: subtotal }];
  
  displayItems.forEach((item: any, i: number) => {
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
    const priceVal = item.rate || item.price || 0;
    const priceText = priceVal
      ? `${currency === "LKR" ? "Rs." : currency} ${parseFloat(priceVal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "-";
    drawTextAligned(priceText, 1525, rowTop, 37, helvetica, "#222222", "center", 439);

    // Total
    drawTextAligned(formatMoney(item.total, currency), 1700, rowTop, 37, helvetica, "#222222", "right", 562);
  });

  // ── 6. Subtotal ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(subtotal, currency), 1640, 2225, 45, helvetica, "#222222", "right", 649);

  // ── 7. Discount ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(discountVal, currency), 1640, 2300, 45, helvetica, "#222222", "right", 649);

  // ── 8. Advance ────────────────────────────────────────────────────────────────
  drawTextAligned(formatMoneySlash(advanceVal, currency), 1640, 2390, 45, helvetica, "#222222", "right", 649);

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

  // ── 11. Notes ────────────────────────────────────────────────────────
  if (notes) {
    const { x, y, size } = convert(2720, 875, 40);
    const color       = hexToRgb("#6b7280");
    const lineSpacing = size * 1.35;
    let   currentY    = y - size;

    const titleText = "NOTES:";
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, size * 1.1);
    page.drawText(titleText, { x, y: currentY, size: size * 1.1, font: helveticaBold, color: hexToRgb("#1a3a4a") });
    
    // Underline the NOTES: title
    page.drawLine({
      start: { x, y: currentY - 2 },
      end: { x: x + titleWidth, y: currentY - 2 },
      thickness: 1,
      color: hexToRgb("#1a3a4a")
    });

    currentY -= lineSpacing + 4; // Add a bit of space after the underline

    const lines = wrapText(notes, helvetica, size, 650 * scaleX);
    for (const line of lines) {
      page.drawText(line, { x, y: currentY, size, font: helvetica, color });
      currentY -= lineSpacing;
    }
  }

  return await pdfDoc.save();
}
