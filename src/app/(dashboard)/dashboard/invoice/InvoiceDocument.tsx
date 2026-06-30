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
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function generateInvoicePDF(invoice: any): Promise<Uint8Array> {
  console.log("generateInvoicePDF input:", invoice);
  const pdfDoc = await PDFDocument.create();
  
  // A4 size: 595.276 x 841.89 points
  const page = pdfDoc.addPage([595.276, 841.89]);
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Fetch the background template image
  try {
    const bgResponse = await fetch("/invoice.png");
    if (!bgResponse.ok) {
      throw new Error(`Failed to fetch /invoice.png: ${bgResponse.statusText}`);
    }
    const bgBytes = await bgResponse.arrayBuffer();
    const bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: 595.276,
      height: 841.89,
    });
  } catch (error) {
    console.error("Could not load invoice background image, proceeding without background:", error);
  }

  const {
    invoice_id,
    billing_address,
    date,
    currency,
    subtotal,
    discount,
    advance,
    total,
    total_due,
    items = []
  } = invoice;

  const width = 595.276;
  const height = 841.89;
  const scaleX = width / 2480;
  const scaleY = height / 3508;
  const scaleFont = scaleX;

  const convert = (topPx: number, leftPx: number, fontPx: number = 37) => {
    const x = leftPx * scaleX;
    const y = height - (topPx * scaleY);
    const size = fontPx * scaleFont;
    return { x, y, size };
  };

  const drawTextAligned = (
    text: string,
    leftPx: number,
    topPx: number,
    fontPx: number,
    font: any,
    colorHexStr: string,
    align: "left" | "center" | "right" = "left",
    widthPx?: number
  ) => {
    if (!text) return;
    const { x, y, size } = convert(topPx, leftPx, fontPx);
    const yAdjusted = y - size;
    const color = hexToRgb(colorHexStr);

    let finalX = x;
    if (align !== "left" && widthPx !== undefined) {
      const boxWidth = widthPx * scaleX;
      const textWidth = font.widthOfTextAtSize(text, size);
      if (align === "right") {
        finalX = x + boxWidth - textWidth;
      } else if (align === "center") {
        finalX = x + (boxWidth - textWidth) / 2;
      }
    }

    page.drawText(text, {
      x: finalX,
      y: yAdjusted,
      size,
      font,
      color,
    });
  };

  // 1. Invoice Number
  drawTextAligned(
    invoice_id || "",
    1942,
    440,
    49,
    helveticaBold,
    "#1a3a4a"
  );

  // 2. Billing Address
  if (billing_address) {
    const { x, y, size } = convert(940, 130, 45);
    const color = hexToRgb("#1a3a4a");
    const lines = wrapText(billing_address, helveticaBold, size, 470 * scaleX);
    let currentY = y - size;
    const lineSpacing = size * 1.35;
    for (const line of lines) {
      page.drawText(line, {
        x,
        y: currentY,
        size,
        font: helveticaBold,
        color,
      });
      currentY -= lineSpacing;
    }
  }

  // 3. Date
  drawTextAligned(
    formatDate(date),
    930,
    842,
    46,
    helvetica,
    "#222222"
  );

  // 4. Total Due
  drawTextAligned(
    formatMoney(total_due || total, currency),
    769,
    955,
    70,
    helveticaBold,
    "#1a3a4a"
  );

  // 5. Line Items
  const rowTops = [1470, 1645, 1820, 1995];
  items.forEach((item: any, i: number) => {
    if (!item.description) return;
    const rowTop = rowTops[i] || (1470 + i * 175);

    // Description
    const { x, y, size } = convert(rowTop, 875, 37);
    const color = hexToRgb("#222222");
    const descLines = wrapText(item.description, helvetica, size, (1525 - 875 - 30) * scaleX);
    let descY = y - size;
    const descLineSpacing = size * 1.35;
    descLines.forEach((line) => {
      page.drawText(line, {
        x,
        y: descY,
        size,
        font: helvetica,
        color,
      });
      descY -= descLineSpacing;
    });

    // Price
    const priceText = item.price ? `${invoice.currency === "LKR" ? "Rs." : invoice.currency} ${item.price}` : "-";
    drawTextAligned(
      priceText,
      1525,
      rowTop,
      37,
      helvetica,
      "#222222",
      "center",
      439
    );

    // Total
    drawTextAligned(
      formatMoney(item.total, currency),
      1700,
      rowTop,
      37,
      helvetica,
      "#222222",
      "right",
      562
    );
  });

  // 6. Subtotal
  drawTextAligned(
    formatMoneySlash(subtotal, currency),
    1640,
    2225,
    45,
    helvetica,
    "#222222",
    "right",
    649
  );

  // 7. Discount
  drawTextAligned(
    formatMoneySlash(discount, currency),
    1640,
    2300,
    45,
    helvetica,
    "#222222",
    "right",
    649
  );

  // 8. Advance
  drawTextAligned(
    formatMoneySlash(advance, currency),
    1640,
    2390,
    45,
    helvetica,
    "#222222",
    "right",
    649
  );

  // 9. Total
  drawTextAligned(
    formatMoney(total, currency),
    1600,
    2560,
    60,
    helveticaBold,
    "#1a3a4a",
    "right",
    649
  );

  return await pdfDoc.save();
}

export default function InvoiceDocument({ invoice }: { invoice: any }) {
  return null;
}