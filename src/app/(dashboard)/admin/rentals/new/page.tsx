"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  KeyRound,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Info,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ClientCombobox from "../../components/ClientCombobox";
import { getClients } from "../../actions/actions";
import {
  createRental,
  getRentableInventory,
  getClientInvoicesForRentals,
  checkRentalAvailability,
  ItemAvailabilityCheck
} from "../../actions/rentals";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

interface EquipmentItemState {
  key: string;
  inventory_id: string;
  item_name: string;
  daily_rate: string;
  quantity: number;
}

export default function NewRentalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get("item_id");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [rentableInventory, setRentableInventory] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  // Client existing invoices
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Common rental fields
  const [clientData, setClientData] = useState({
    client_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    client_company: ""
  });

  const [dateData, setDateData] = useState({
    start_date: todayStr,
    end_date: tomorrowStr,
    rental_days: 1
  });

  const [metaData, setMetaData] = useState({
    status: "Active",
    notes: "",
    deposit_amount: "0"
  });

  // Invoicing toggle: turn on or off
  const [createInvoice, setCreateInvoice] = useState(true);
  const [linkToExisting, setLinkToExisting] = useState(false);
  const [selectedExistingInvoiceId, setSelectedExistingInvoiceId] = useState<string>("");

  // Multiple equipment items
  const [items, setItems] = useState<EquipmentItemState[]>([
    {
      key: "item-init",
      inventory_id: "",
      item_name: "",
      daily_rate: "0",
      quantity: 1
    }
  ]);

  // Real-time Date clash detection
  const [clashResults, setClashResults] = useState<ItemAvailabilityCheck[]>([]);
  const [checkingClashes, setCheckingClashes] = useState(false);

  useEffect(() => {
    if (!dateData.start_date || !dateData.end_date) return;
    const activeItems = items.filter(
      (it) => it.item_name.trim() || it.inventory_id
    );
    if (activeItems.length === 0) {
      setClashResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingClashes(true);
      checkRentalAvailability({
        items: items.map((it) => ({
          inventory_id: it.inventory_id || null,
          item_name: it.item_name
        })),
        start_date: dateData.start_date,
        end_date: dateData.end_date
      })
        .then((res) => setClashResults(res))
        .catch((err) => console.error("Error checking date clash:", err))
        .finally(() => setCheckingClashes(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [dateData.start_date, dateData.end_date, items]);

  const hasAnyClash = useMemo(() => {
    return clashResults.some((c) => c && c.has_clash);
  }, [clashResults]);

  // Load clients and inventory
  useEffect(() => {
    getClients()
      .then((cls) => {
        setClients(cls);
        setClientsLoading(false);
      })
      .catch(() => setClientsLoading(false));

    getRentableInventory()
      .then((inv) => {
        setRentableInventory(inv);
        setInventoryLoading(false);

        // Preselect item if query param matches
        if (preselectedItemId) {
          const matched = inv.find((i: any) => String(i.id) === String(preselectedItemId));
          if (matched) {
            setItems([
              {
                key: "item-preselected",
                inventory_id: String(matched.id),
                item_name: matched.item_name,
                daily_rate: String(matched.rental_price_per_day || 0),
                quantity: 1
              }
            ]);
          }
        }
      })
      .catch(() => setInventoryLoading(false));
  }, [preselectedItemId]);

  // Fetch client invoices when client changes
  useEffect(() => {
    if (!clientData.client_id && !clientData.client_email) {
      setClientInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    getClientInvoicesForRentals(clientData.client_id || null, clientData.client_email || null)
      .then((invs) => {
        setClientInvoices(invs);
        if (invs.length > 0) {
          setSelectedExistingInvoiceId(invs[0].invoice_id);
        } else {
          setSelectedExistingInvoiceId("");
          setLinkToExisting(false);
        }
      })
      .catch(() => setClientInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, [clientData.client_id, clientData.client_email]);

  // Handle Client selection
  const handleClientChange = (e: { target: { name: string; value: string } }) => {
    const val = e.target.value;
    if (val === "new") {
      setClientData({
        client_id: "",
        client_name: "",
        client_email: "",
        client_phone: "",
        client_company: ""
      });
      return;
    }

    const selected = clients.find((c: any) => String(c.id) === String(val));
    if (selected) {
      setClientData({
        client_id: String(selected.id),
        client_name: selected.name || "",
        client_email: selected.email || "",
        client_phone: selected.phone || "",
        client_company: selected.company || ""
      });
    } else {
      setClientData((prev) => ({ ...prev, client_id: val }));
    }
  };

  // Handle dates change
  const handleDatesChange = (start: string, end: string) => {
    const days = calculateDays(start, end);
    setDateData({
      start_date: start,
      end_date: end,
      rental_days: days
    });
  };

  // Equipment Item management
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `item-${Date.now()}-${Math.random()}`,
        inventory_id: "",
        item_name: "",
        daily_rate: "0",
        quantity: 1
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemInventorySelect = (index: number, itemId: string) => {
    const selected = rentableInventory.find((i: any) => String(i.id) === String(itemId));
    setItems((prev) => {
      const next = [...prev];
      if (selected) {
        next[index] = {
          ...next[index],
          inventory_id: String(selected.id),
          item_name: selected.item_name,
          daily_rate: String(selected.rental_price_per_day || 0)
        };
      } else {
        next[index] = {
          ...next[index],
          inventory_id: itemId
        };
      }
      return next;
    });
  };

  const handleItemFieldChange = (index: number, field: keyof EquipmentItemState, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  // Calculations
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const rate = parseFloat(item.daily_rate) || 0;
      const qty = item.quantity || 1;
      return sum + rate * dateData.rental_days * qty;
    }, 0);
  }, [items, dateData.rental_days]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientData.client_name.trim()) {
      alert("Please enter or select a client name.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        alert(`Please enter an item name for equipment #${i + 1}.`);
        return;
      }
    }

    if (hasAnyClash) {
      if (
        !confirm(
          "Warning: One or more equipment items clash with existing active or reserved bookings for these dates. Do you want to proceed anyway?"
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createRental({
        items: items.map((it) => ({
          inventory_id: it.inventory_id || null,
          item_name: it.item_name.trim(),
          daily_rate: parseFloat(it.daily_rate) || 0,
          quantity: it.quantity || 1,
          total_amount: (parseFloat(it.daily_rate) || 0) * dateData.rental_days * (it.quantity || 1)
        })),
        existing_invoice_id: createInvoice && linkToExisting ? selectedExistingInvoiceId || null : null,
        auto_create_invoice: createInvoice && !linkToExisting,
        client_id: clientData.client_id || null,
        client_name: clientData.client_name.trim(),
        client_email: clientData.client_email.trim() || null,
        client_phone: clientData.client_phone.trim() || null,
        start_date: dateData.start_date,
        end_date: dateData.end_date,
        rental_days: dateData.rental_days,
        total_amount: grandTotal,
        deposit_amount: parseFloat(metaData.deposit_amount) || 0,
        status: metaData.status,
        notes: metaData.notes.trim() || undefined
      });

      router.push("/admin/rentals");
    } catch (err) {
      console.error(err);
      alert("Failed to create rental booking.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Client & Multiple Equipment Items */}
          <div className="space-y-6">
            {/* Client Details */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Client Details</h2>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Select Client *</label>
                <ClientCombobox
                  name="clientId"
                  value={String(clientData.client_id || "")}
                  onChange={handleClientChange}
                  clients={clients.map((c: any) => ({
                    id: String(c.id),
                    name: c.name || "Unnamed",
                    email: c.email || ""
                  }))}
                  loading={clientsLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={clientData.client_name}
                    onChange={(e) => setClientData({ ...clientData, client_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Company</label>
                  <input
                    type="text"
                    value={clientData.client_company}
                    onChange={(e) =>
                      setClientData({ ...clientData, client_company: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="Company (Optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Email</label>
                  <input
                    type="email"
                    value={clientData.client_email}
                    onChange={(e) => setClientData({ ...clientData, client_email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="client@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Phone</label>
                  <input
                    type="text"
                    value={clientData.client_phone}
                    onChange={(e) => setClientData({ ...clientData, client_phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="+94 7X XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Equipment Selection (Multi-Item Support) */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Equipment Selection</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {items.map((item, index) => {
                  const itemDailyRate = parseFloat(item.daily_rate) || 0;
                  const itemQty = item.quantity || 1;
                  const itemSubtotal = itemDailyRate * dateData.rental_days * itemQty;

                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                          Item #{index + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            title="Remove this item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Inventory Dropdown */}
                      <div>
                        <select
                          value={item.inventory_id}
                          onChange={(e) => handleItemInventorySelect(index, e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-brand-500 transition-colors text-white text-xs sm:text-sm"
                        >
                          <option value="">— Choose from inventory (or type custom name below) —</option>
                          {rentableInventory.map((invItem: any) => (
                            <option key={invItem.id} value={String(invItem.id)}>
                              {invItem.item_name}{" "}
                              {invItem.serial_number ? `(SN: ${invItem.serial_number})` : ""} —{" "}
                              {formatLKR(invItem.rental_price_per_day)}/day{" "}
                              {invItem.is_currently_out ? `[Currently Rented Out]` : `[In Stock]`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Equipment Item Name */}
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Equipment Item Name *</label>
                        <input
                          type="text"
                          required
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemFieldChange(index, "item_name", e.target.value)
                          }
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                          placeholder="e.g. Sony A7IV Camera Body, Wireless Mic..."
                        />
                      </div>

                      {/* Rate, Quantity & Line Subtotal */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-400">Daily Rate (LKR)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.daily_rate}
                            onChange={(e) =>
                              handleItemFieldChange(index, "daily_rate", e.target.value)
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-400">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemFieldChange(
                                index,
                                "quantity",
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                          />
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-right">
                          <span className="text-[10px] text-gray-400 block">Item Subtotal</span>
                          <span className="text-xs font-bold text-brand-400">
                            {formatLKR(itemSubtotal)}
                          </span>
                        </div>
                      </div>

                      {/* Date Clash Warning Banner for Item */}
                      {clashResults[index]?.has_clash && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-2 animate-in fade-in">
                          <div className="font-semibold flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>Booking Date Clash Detected!</span>
                          </div>
                          <div className="text-[11px] text-gray-300">
                            This equipment already has active or reserved bookings during these dates:
                          </div>
                          <div className="space-y-1.5 pt-0.5">
                            {clashResults[index].clashes.map((c, ci) => (
                              <div
                                key={ci}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-black/60 px-3 py-2 rounded-lg border border-red-500/20 text-[11px]"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-red-300 font-bold">{c.rental_code}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 font-semibold uppercase">
                                    {c.status}
                                  </span>
                                  <span className="text-white font-medium">{c.client_name}</span>
                                </div>
                                <div className="text-red-300 font-mono font-medium">
                                  {c.start_date} &rarr; {c.end_date}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Another Item Button */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-3 px-4 border border-dashed border-white/20 hover:border-brand-500/50 hover:bg-brand-500/5 text-gray-300 hover:text-brand-300 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Item</span>
                </button>
              </div>

              {/* Booking Status */}
              <div className="space-y-1 pt-2">
                <label className="text-sm text-gray-400">Booking Status</label>
                <select
                  value={metaData.status}
                  onChange={(e) => setMetaData({ ...metaData, status: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                >
                  <option value="Active">Active (Handed Over / Out)</option>
                  <option value="Reserved">Reserved (Upcoming Booking)</option>
                  <option value="Returned">Returned (Back in Stock)</option>
                </select>
              </div>
            </div>

            {/* Handover & Condition Notes */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Handover Notes</h2>
              <div>
                <textarea
                  value={metaData.notes}
                  onChange={(e) => setMetaData({ ...metaData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm min-h-[90px]"
                  placeholder="Included batteries, memory cards, chargers, hard case, cables..."
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Dates, Grand Pricing & Invoicing Integration */}
          <div className="space-y-6">
            {/* Rental Dates & Duration */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Rental Dates & Duration</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={dateData.start_date}
                    onChange={(e) => handleDatesChange(e.target.value, dateData.end_date)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">End Date *</label>
                  <input
                    type="date"
                    required
                    value={dateData.end_date}
                    onChange={(e) => handleDatesChange(dateData.start_date, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Total Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={dateData.rental_days}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 1;
                    setDateData((prev) => ({ ...prev, rental_days: days }));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm font-semibold"
                />
              </div>

              {/* Clash Alert Banner */}
              {hasAnyClash && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-400 block mb-0.5">Booking Schedule Conflict</span>
                    <span>
                      The selected dates clash with already booked or rented out equipment. Please review the highlighted equipment item alerts.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Combined Pricing Summary & Deposit */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Combined Pricing & Deposit</h2>

              {/* Items Breakdown */}
              <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] border border-white/10 p-3">
                {items.map((it, idx) => {
                  const rate = parseFloat(it.daily_rate) || 0;
                  const qty = it.quantity || 1;
                  const lineTotal = rate * dateData.rental_days * qty;
                  return (
                    <div key={it.key} className="flex justify-between items-center text-xs py-1.5 px-1 first:pt-0 last:pb-0">
                      <div className="text-gray-300">
                        <span className="font-medium text-white">{it.item_name || `Item #${idx + 1}`}</span>
                        <span className="text-gray-500 ml-1.5">
                          ({qty} × {dateData.rental_days}d @ {formatLKR(rate)})
                        </span>
                      </div>
                      <div className="font-semibold text-white">{formatLKR(lineTotal)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Security Deposit (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={metaData.deposit_amount}
                  onChange={(e) => setMetaData({ ...metaData, deposit_amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                  placeholder="0.00 (Optional)"
                />
              </div>

              {/* Grand Total Display */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-brand-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Combined Total Amount</span>
                  <span className="text-xs text-brand-400 font-medium">
                    {items.length} {items.length === 1 ? "item" : "items"} • {dateData.rental_days}{" "}
                    {dateData.rental_days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Create Invoice Toggle */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Create Invoice</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateInvoice(!createInvoice)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    createInvoice ? "bg-brand-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      createInvoice ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {createInvoice && clientInvoices.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkToExisting}
                      onChange={(e) => setLinkToExisting(e.target.checked)}
                      className="rounded bg-white/5 border-white/20 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Add to existing client invoice instead of creating a new one</span>
                  </label>
                  {linkToExisting && (
                    <select
                      value={selectedExistingInvoiceId}
                      onChange={(e) => setSelectedExistingInvoiceId(e.target.value)}
                      className="w-full bg-black/60 border border-brand-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none mt-1"
                    >
                      {clientInvoices.map((inv: any) => (
                        <option key={inv.invoice_id} value={inv.invoice_id}>
                          {inv.invoice_id} • {inv.project_name || "Invoice"} • Due: {formatLKR(inv.total_due)}{" "}
                          ({inv.payment_status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/admin/rentals"
                className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-2xl text-sm font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {items.length > 1
                    ? `Create Rental (${items.length} Items)`
                    : "Create Rental"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
