import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatMoney = (value: any, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "Rs. 0.00";
  const prefix = currency === "LKR" ? "Rs. " : currency;
  return `${prefix}${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
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
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Background template ────────────────────────────────────────────────────
  try {
    const bgResponse = await fetch("/quotation.png");
    if (!bgResponse.ok) throw new Error(`Failed to fetch /quotation.png`);
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
    legal_name,
    description, // Used as Project Name
    userEmail,
    phone,
    payment_method,
  } = quotation;

  const paymentMethod = payment_method || quotation.paymentMethod;

  const discountVal = parseFloat(discount || 0);
  const total = parseFloat(amount || 0);
  const subtotal = total + discountVal;
  const advanceVal = parseFloat(advance || 0);

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

  // Register FontKit
  let fontkit;
  try {
    const fontkitModule = await import(/* webpackIgnore: true */ '@pdf-lib/fontkit');
    fontkit = fontkitModule.default || fontkitModule;
  } catch (e) {
    console.warn("Could not import @pdf-lib/fontkit locally, falling back to CDN...");
    const res = await fetch("https://unpkg.com/@pdf-lib/fontkit@0.0.4/dist/fontkit.umd.min.js");
    const script = await res.text();
    // Evaluate the UMD script in the global scope so it sets window.fontkit
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
      // Calculate label width so value sits nicely after the template's label
      const labelW = primaryFontBold.widthOfTextAtSize(label, size);
      page.drawText(value, { x: x + labelW + (20 * scaleX), y: yAdj, size, font: font, color: hexToRgb("#222222") });
  }

  // ── 1. Quote Info (Top Right) ────────────────────────────────────────────────────────
  const quoteNum = `QT-${String(id).padStart(4, "0")}`;
  drawLabelValue("Quote Ref:", quoteNum, 1810, 610, 42, primaryFont);
  drawLabelValue("Quote Date:", formatDate(date), 1788, 660, 42, primaryFont);
  
  // Calculate Valid Until (from quotation or 14 days fallback)
  let validUntilDate = new Date(date || new Date());
  if (quotation.valid_until) {
    validUntilDate = new Date(quotation.valid_until);
  } else {
    validUntilDate.setDate(validUntilDate.getDate() + 14);
  }
  drawLabelValue("Valid Until:", formatDate(validUntilDate), 1810, 705, 42, primaryFont);

  // ── 2. Prepared For (Left) ────────────────────────────────────────
  if (legal_name || client_name || billing_address || userEmail || phone) {
    const { x, y, size } = convert(980, 150, 65);
    const color       = hexToRgb("#222222");
    const normalSize  = size * 0.65;
    const lineSpacing = normalSize * 1.4;
    let   currentY    = y - size;

    const nameToUse = legal_name || client_name || "";
    if (nameToUse) {
      page.drawText(nameToUse, { x, y: currentY, size, font: primaryFontBold, color });
      currentY -= (size * 1.2);
    }

    if (billing_address) {
      const parts = billing_address.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i += 2) {
         const chunk = parts.slice(i, i + 2).join(", ");
         const textToPrint = chunk + (i + 2 < parts.length ? "," : "");
         page.drawText(textToPrint, { x, y: currentY, size: normalSize, font: primaryFont, color });
         currentY -= lineSpacing;
      }
    }
    
    // Contact line
    const emailStr = quotation.client?.email || userEmail || "";
    const phoneStr = phone || quotation.client?.phone || "";
    const contactStr = [phoneStr, emailStr].filter(Boolean).join(" | ");
    if (contactStr) {
      page.drawText(contactStr, { x, y: currentY, size: normalSize, font: primaryFont, color });
      currentY -= lineSpacing;
    }
  }

  // ── 3. Project (Right) ────────────────────────────────────────
  if (description) {
      const { x, y, size } = convert(980, 1780, 65);
      const color       = hexToRgb("#222222");
      let   currentY    = y - size;
      const lines = wrapText(description, primaryFontBold, size, 650 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: primaryFontBold, color });
        currentY -= (size * 1.2);
      }
  }

  // ── 4. Line Items ────────────────────────────────────────────────────────────
  const startRowTop = 1580;
  const rowHeight = 150;
  
  const displayItems = items.length > 0 ? items : [{ description: description || 'Project', quantity: 1, rate: subtotal, total: subtotal }];
  
  displayItems.forEach((item: any, i: number) => {
    if (!item.description) return;
    const rowTop = startRowTop + (i * rowHeight);

    // Description
    const { x, y, size } = convert(rowTop, 150, 42);
    const color           = hexToRgb("#222222");
    
    // Split description into title and subtitle if needed
    const parts = item.description.split("\n");
    page.drawText(parts[0], { x, y: y - size, size: size, font: primaryFontBold, color });
    
    if (parts.length > 1) {
        const subSize = size * 0.8;
        page.drawText(parts.slice(1).join(" "), { x, y: y - size - (size * 1.2), size: subSize, font: primaryFont, color: hexToRgb("#555555") });
    }

    // QTY
    const qty = String(Number(item.quantity || item.qty) || 1).padStart(2, '0');
    drawTextAligned(qty, 1200, rowTop, 42, primaryFont, "#222222", "center", 100);

    // Unit Price
    const priceVal = item.rate || item.price || 0;
    drawTextAligned(formatMoney(priceVal, currency), 1580, rowTop, 42, primaryFont, "#222222", "center", 300);

    // Total
    drawTextAligned(formatMoney(item.total, currency), 2030, rowTop, 42, primaryFont, "#222222", "right", 300);
  });

  // ── 5. Totals ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoney(subtotal, currency), 2030, 2330, 45, primaryFont, "#222222", "right", 300);
  drawTextAligned(formatMoney(discountVal, currency), 2030, 2400, 45, primaryFont, "#222222", "right", 300);
  drawTextAligned(formatMoney(total, currency), 2030, 2570, 75, primaryFontBold, "#222222", "right", 300);

  // ── 6. Payment Terms / Notes ─────────────────────────────────────────────────
  if (notes || paymentMethod) {
    const { x, y, size } = convert(3000, 150, 40);
    const color       = hexToRgb("#222222");
    const lineSpacing = size * 1.35;
    let   currentY    = y - size;
    
    // Draw an X if Option A or Option B is selected based on template coordinates
    if (paymentMethod && paymentMethod.startsWith("Option A")) {
         const { x: cx, y: cy } = convert(2858, 142, 40);
         page.drawText("X", { x: cx, y: cy - 40, size: 24, font: primaryFontBold, color });
    } else if (paymentMethod && paymentMethod.startsWith("Option B")) {
         const { x: cx, y: cy } = convert(3025, 142, 40);
         page.drawText("X", { x: cx, y: cy - 40, size: 24, font: primaryFontBold, color });
    }


  }

  return await pdfDoc.save();
}
