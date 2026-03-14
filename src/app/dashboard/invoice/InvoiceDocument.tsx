"use client";
import React from "react";

// A4 display size: 794 x 1123px (96dpi)
// Original design was: 2480 x 3508px (300dpi)
// We use percentage-based positioning so layout scales to any size.

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "";
  const prefix = currency === "LKR" ? "Rs." : currency;
  return `${prefix} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
};

const formatMoneySlash = (value, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "-";
  const prefix = currency === "LKR" ? "Rs." : currency;
  const suffix = currency === "LKR" ? "/-" : "";
  return `${prefix} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`.trim();
};

// Convert original 2480x3508 pixel coords to percentages
const px = (v, total) => `${((v / total) * 100).toFixed(4)}%`;

export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const {
    invoice_id,
    billing_address,
    date,
    currency,
    description_1, price_1, total_1,
    description_2, price_2, total_2,
    description_3, price_3, total_3,
    description_4, price_4, total_4,
    subtotal,
    discount,
    advance,
    total,
    total_due,
  } = invoice;

  const items = [
    { description: description_1, price: price_1, total: total_1 },
    { description: description_2, price: price_2, total: total_2 },
    { description: description_3, price: price_3, total: total_3 },
    { description: description_4, price: price_4, total: total_4 },
  ];

  // Row Y positions from original 2480x3508 design
  const rowTops = [1470, 1645, 1820, 1995];

  // Helper: build absolute position style using % coords
  // fontScale: font size as fraction of container width (original_px / 2480)
  const pos = (topPx, leftPx, fontPx = 37, extra = {}) => ({
    position: "absolute" as const,
    top: px(topPx, 3508),
    left: px(leftPx, 2480),
    fontSize: `${((fontPx / 2480) * 100).toFixed(4)}cqw`,
    fontFamily: "Arial, Helvetica, sans-serif",
    lineHeight: "1.35",
    ...extra,
  });

  return (
    <div
      id="invoice-render"
      style={{
        position: "relative",
        width: "794px",
        height: "1123px",
        containerType: "inline-size",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Background — fills entire A4 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/invoice.png"
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
        }}
      />

      {/* Invoice Number */}
      <div style={pos(440, 1942, 49, { color: "#1a3a4a", fontWeight: "600" })}>
        {invoice_id}
      </div>

      {/* Billing Address */}
      <div style={{
        ...pos(900, 125, 45, { color: "#1a3a4a", fontWeight: "700", lineHeight: "1.55", whiteSpace: "pre-line" }),
        width: px(377, 2480),
      }}>
        {billing_address}
      </div>

      {/* Date */}
      <div style={pos(820, 930, 46, { color: "#222" })}>
        {formatDate(date)}
      </div>

      {/* Total Due */}
      <div style={pos(935, 769, 70, { color: "#1a3a4a", fontWeight: "700" })}>
        {formatMoney(total_due || total, currency)}
      </div>

      {/* Line Items */}
      {items.map((item, i) =>
        item.description ? (
          <div key={i}>
            {/* Description */}
            <div style={{
              ...pos(rowTops[i], 875, 37, { color: "#222" }),
              width: px(702, 2480),
              overflow: "visible",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}>
              {item.description}
            </div>

            {/* Price */}
            <div style={{
              ...pos(rowTops[i], 1525, 37, { color: "#222", textAlign: "center" }),
              width: px(439, 2480),
            }}>
             {item.price ? `${invoice.currency === "LKR" ? "Rs." : invoice.currency} ${item.price}` : "-"}
            </div>

            {/* Total */}
            <div style={{
              ...pos(rowTops[i], 1700, 37, { color: "#222", textAlign: "right" }),
              width: px(562, 2480),
            }}>
              {formatMoney(item.total, currency)}
            </div>
          </div>
        ) : null
      )}

      {/* Subtotal */}
      <div style={{
        ...pos(2200, 1640, 45, { color: "#222", textAlign: "right" }),
        width: px(649, 2480),
      }}>
        {formatMoneySlash(subtotal, currency)}
      </div>

      {/* Discount */}
      <div style={{
        ...pos(2285, 1640, 45, { color: "#222", textAlign: "right" }),
        width: px(649, 2480),
      }}>
        {formatMoneySlash(discount, currency)}
      </div>

      {/* Advance */}
      <div style={{
        ...pos(2368, 1640, 45, { color: "#222", textAlign: "right" }),
        width: px(649, 2480),
      }}>
        {formatMoneySlash(advance, currency)}
      </div>

      {/* Total */}
      <div style={{
        ...pos(2525, 1600, 60, { color: "#1a3a4a", fontWeight: "700", textAlign: "right" }),
        width: px(649, 2480),
      }}>
        {formatMoney(total, currency)}
      </div>
    </div>
  );
}