import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatMoney = (value: any, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "LKR 0.00";
  const prefix = currency === "LKR" ? "LKR " : currency;
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

export async function generateQuotationPDF(quotation: any) {
  const pdfDoc = await PDFDocument.create();

  // A4 size: 595.276 x 841.89 points
  const page = pdfDoc.addPage([595.276, 841.89]);

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Background template ────────────────────────────────────────────────────
  try {
    const bgBytes = await fetchImageAsPngBytes(`/quotation.png?v=${Date.now()}`);
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
  let projectNameToPrint = description;
  if (items && items.length > 0) {
      // Check if it's a legacy auto-generated project name from the cart
      const legacyAutoName = items.map((i: any) => (i.description || "").replace(")", "")).join(", ");
      if (description === legacyAutoName) {
          projectNameToPrint = `Quotation #${String(id).padStart(4, '0')}`;
      }
  }

  if (projectNameToPrint) {
      const { x, y, size } = convert(980, 1780, 65);
      const color       = hexToRgb("#222222");
      let   currentY    = y - size;
      const lines = wrapText(projectNameToPrint, primaryFontBold, size, 650 * scaleX);
      for (const line of lines) {
        page.drawText(line, { x, y: currentY, size, font: primaryFontBold, color });
        currentY -= (size * 1.2);
      }
  }

  // ── 4. Line Items ────────────────────────────────────────────────────────────
  // 1. THIS MUST MATCH THE BACKGROUND IMAGE GRID. Do not change startRowTop.
  const startRowTop = 1534; // Mathematically calculated from the PNG template lines
  const rowHeight = 138; // The exact pixel distance between the underlines in the template
  
  // 2. Change THIS value to shift text up (-) or down (+) inside their rows.
  const visualOffsetY = 0;  
  
  const displayItems = items.length > 0 ? items : [{ description: description || 'Project', quantity: 1, rate: subtotal, total: subtotal }];
  
  displayItems.forEach((item: any, i: number) => {
    if (!item.description) return;
    const rowTop = startRowTop + (i * rowHeight) + visualOffsetY;

    let parts = item.description.split("\n");
    // Intercept legacy item descriptions that lacked newlines (e.g., "Personal Portfolio Website – Modern UI)")
    if (parts.length === 1 && item.description.includes(" – ")) {
      const splitIdx = item.description.indexOf(" – ");
      const title = item.description.substring(0, splitIdx).trim();
      let subtitle = item.description.substring(splitIdx + 3).trim();
      if (subtitle.endsWith(")")) {
        subtitle = subtitle.substring(0, subtitle.length - 1); // Remove trailing parenthesis
      }
      if (!subtitle.startsWith("(")) subtitle = `(${subtitle})`;
      parts = [title, subtitle];
    }
    
    const titleFontSize = 42;
    const subFontSize = titleFontSize * 0.75;
    const subLineHeight = subFontSize * 1.3;
    const blockHeight = titleFontSize + (parts.length - 1) * subLineHeight;
    const descTopPx = rowTop + (rowHeight - blockHeight) / 2;
    const singleLineTopPx = rowTop + (rowHeight - 42) / 2;

    // Description
    const { x, y, size } = convert(descTopPx, 202, titleFontSize);
    const color = hexToRgb("#222222");
    
    let currentY = y - size;
    page.drawText(parts[0], { x, y: currentY, size: size, font: primaryFontBold, color });
    
    if (parts.length > 1) {
        const subSize = size * 0.75;
        page.drawText(parts.slice(1).join("\n"), { 
            x, 
            y: currentY - (size * 0.95), 
            size: subSize, 
            font: primaryFont, 
            color: hexToRgb("#555555"),
            lineHeight: subSize * 1.3
        });
    }

    // QTY
    const qty = String(Number(item.quantity || item.qty) || 1).padStart(2, '0');
    drawTextAligned(qty, 1190, singleLineTopPx, 42, primaryFont, "#222222", "center", 100);

    // Unit Price (Center ~1674. Right-aligned for decimals: 1524 + 280 = 1804 edge)
    const priceVal = item.rate || item.price || 0;
    drawTextAligned(formatMoney(priceVal, currency), 1524, singleLineTopPx, 42, primaryFont, "#222222", "right", 280);

    // Total / Amount (Center ~2136. Right-aligned for decimals: 1986 + 280 = 2266 edge)
    drawTextAligned(formatMoney(item.total, currency), 1986, singleLineTopPx, 42, primaryFont, "#222222", "right", 280);
  });

  // ── 5. Totals ───────────────────────────────────────────────────────────────
  drawTextAligned(formatMoney(subtotal, currency), 1986, 2330, 45, primaryFont, "#222222", "right", 280);
  drawTextAligned(formatMoney(discountVal, currency), 1986, 2400, 45, primaryFont, "#222222", "right", 280);
  drawTextAligned(formatMoney(total, currency), 1986, 2560, 75, primaryFontBold, "#222222", "right", 280);

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
