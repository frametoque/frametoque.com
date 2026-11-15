"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Calendar, DollarSign, AlertTriangle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import ClientCombobox from "../../../components/ClientCombobox";
import { getClients } from "../../../actions/actions";
import {
  getRentalById,
  updateRentalWithItems,
  getRentableInventory,
  checkRentalAvailability,
  ItemAvailabilityCheck
} from "../../../actions/rentals";

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
  id?: number;
  rental_code?: string;
  inventory_id: string;
  item_name: string;
  daily_rate: string;
  quantity: number;
}

export default function EditRentalPage() {
  const router = useRouter();
  const { rental_id } = useParams();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [rentableInventory, setRentableInventory] = useState<any[]>([]);

  // Multiple equipment items
  const [items, setItems] = useState<EquipmentItemState[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<number[]>([]);

  // Real-time Date clash detection
  const [clashResults, setClashResults] = useState<ItemAvailabilityCheck[]>([]);
  const [checkingClashes, setCheckingClashes] = useState(false);

  const [formData, setFormData] = useState({
    id: 0,
    rental_code: "",
    client_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    client_company: "",
    start_date: "",
    end_date: "",
    return_date: "",
    rental_days: 1,
    deposit_amount: "0",
    status: "Active",
    payment_status: "Unpaid",
    paid_amount: "0",
    notes: ""
  });

  useEffect(() => {
    if (!rental_id) return;

    Promise.all([
      getClients(),
      getRentableInventory(),
      getRentalById(rental_id as string)
    ])
      .then(([cls, invItems, rental]) => {
        setClients(cls);
        setRentableInventory(invItems);

        if (rental) {
          setFormData({
            id: rental.id,
            rental_code: rental.rental_code,
            client_id: rental.client_id ? String(rental.client_id) : "",
            client_name: rental.client_name || "",
            client_email: rental.client_email || "",
            client_phone: rental.client_phone || "",
            client_company: rental.client_company || "",
            start_date: rental.start_date || "",
            end_date: rental.end_date || "",
            return_date: rental.return_date || "",
            rental_days: rental.rental_days || 1,
            deposit_amount: String(rental.deposit_amount || 0),
            status: rental.status || "Active",
            payment_status: rental.payment_status || "Unpaid",
            paid_amount: String(rental.paid_amount || 0),
            notes: rental.notes || ""
          });

          const initialItems: EquipmentItemState[] = [
            {
              key: `item-${rental.id}`,
              id: rental.id,
              rental_code: rental.rental_code,
              inventory_id: rental.inventory_id ? String(rental.inventory_id) : "",
              item_name: rental.item_name || "",
              daily_rate: String(rental.daily_rate || 0),
              quantity: rental.quantity || 1
            }
          ];

          if (rental.related_items && rental.related_items.length > 0) {
            rental.related_items.forEach((rel: any) => {
              initialItems.push({
                key: `item-${rel.id}`,
                id: rel.id,
                rental_code: rel.rental_code,
                inventory_id: rel.inventory_id ? String(rel.inventory_id) : "",
                item_name: rel.item_name || "",
                daily_rate: String(rel.daily_rate || 0),
                quantity: rel.quantity || 1
              });
            });
          }

          setItems(initialItems);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [rental_id]);

  useEffect(() => {
    if (formData.rental_code && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rental:info", {
          detail: {
            rental_code: formData.rental_code,
            item_name: formData.rental_code
          }
        })
      );
    }
  }, [formData.rental_code]);

  const handleClientChange = (e: { target: { name: string; value: string } }) => {
    const val = e.target.value;
    if (val === "new") {
      setFormData((prev) => ({
        ...prev,
        client_id: "",
        client_name: "",
        client_email: "",
        client_phone: "",
        client_company: ""
      }));
      return;
    }

    const selected = clients.find((c: any) => String(c.id) === String(val));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        client_id: String(selected.id),
        client_name: selected.name || "",
        client_email: selected.email || "",
        client_phone: selected.phone || "",
        client_company: selected.company || ""
      }));
    } else {
      setFormData((prev) => ({ ...prev, client_id: val }));
    }
  };

  const handleDatesChange = (start: string, end: string) => {
    const days = calculateDays(start, end);
    setFormData((prev) => ({
      ...prev,
      start_date: start,
      end_date: end,
      rental_days: days
    }));
  };

  // Clash check effect
  useEffect(() => {
    if (!formData.start_date || !formData.end_date) return;
    const activeItems = items.filter(
      (it) => it.item_name.trim() || it.inventory_id
    );
    if (activeItems.length === 0) {
      setClashResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingClashes(true);
      const currentIds = items.map((it) => it.id).filter(Boolean) as number[];
      checkRentalAvailability({
        items: items.map((it) => ({
          inventory_id: it.inventory_id || null,
          item_name: it.item_name
        })),
        start_date: formData.start_date,
        end_date: formData.end_date,
        excludeRentalIds: currentIds
      })
        .then((res) => setClashResults(res))
        .catch((err) => console.error("Error checking date clash:", err))
        .finally(() => setCheckingClashes(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.start_date, formData.end_date, items]);

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
    const removed = items[index];
    if (removed.id) {
      setDeletedItemIds((prev) => [...prev, removed.id!]);
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemInventorySelect = (index: number, invId: string) => {
    const inv = rentableInventory.find((i: any) => String(i.id) === String(invId));
    setItems((prev) => {
      const updated = [...prev];
      if (inv) {
        updated[index] = {
          ...updated[index],
          inventory_id: String(inv.id),
          item_name: inv.item_name,
          daily_rate: String(inv.rental_price_per_day || 0)
        };
      } else {
        updated[index] = {
          ...updated[index],
          inventory_id: ""
        };
      }
      return updated;
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof EquipmentItemState,
    val: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const grandTotal = items.reduce((sum, it) => {
    const rate = parseFloat(it.daily_rate) || 0;
    const qty = it.quantity || 1;
    return sum + rate * (formData.rental_days || 1) * qty;
  }, 0);

  const hasAnyClash = clashResults.some((c) => c?.has_clash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some((it) => !it.item_name.trim())) {
      alert("Please ensure all items have a name.");
      return;
    }
    if (!formData.client_name.trim()) {
      alert("Please select or enter client name.");
      return;
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
      await updateRentalWithItems({
        primary_id: formData.id,
        client_id: formData.client_id || null,
        client_name: formData.client_name.trim(),
        client_email: formData.client_email.trim() || null,
        client_phone: formData.client_phone.trim() || null,
        client_company: formData.client_company.trim() || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        return_date: formData.return_date || null,
        rental_days: formData.rental_days || 1,
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        items: items.map((it) => ({
          id: it.id,
          inventory_id: it.inventory_id || null,
          item_name: it.item_name.trim(),
          daily_rate: parseFloat(it.daily_rate) || 0,
          quantity: it.quantity || 1,
          total_amount:
            (parseFloat(it.daily_rate) || 0) * (formData.rental_days || 1) * (it.quantity || 1)
        })),
        deleted_item_ids: deletedItemIds
      });

      router.push("/admin/rentals");
    } catch (err) {
      console.error(err);
      alert("Failed to update rental booking.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
        Loading rental booking...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Client & Equipment Selection */}
          <div className="space-y-6">
            {/* Client Details */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Client Details</h2>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Select Client *</label>
                <ClientCombobox
                  name="clientId"
                  value={String(formData.client_id || "")}
                  onChange={handleClientChange}
                  clients={clients.map((c: any) => ({
                    id: String(c.id),
                    name: c.name || "Unnamed",
                    email: c.email || ""
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Company</label>
                  <input
                    type="text"
                    value={formData.client_company}
                    onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
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
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="client@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Phone</label>
                  <input
                    type="text"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    placeholder="+94 7X XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Equipment Selection */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Equipment Selection</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {items.map((item, index) => {
                  const rate = parseFloat(item.daily_rate) || 0;
                  const itemSubtotal = rate * (formData.rental_days || 1) * (item.quantity || 1);

                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">
                            Item #{index + 1}
                          </span>
                          {item.rental_code && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                              {item.rental_code}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            ({item.quantity} &times; {formData.rental_days}d @ {formatLKR(rate)})
                          </span>
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors cursor-pointer"
                            title="Remove item"
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
                                  <span className="text-red-300 font-bold">{c.rental_code}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 font-semibold uppercase">
                                    {c.status}
                                  </span>
                                  <span className="text-white font-medium">{c.client_name}</span>
                                </div>
                                <div className="text-red-300 font-medium">
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

              {/* Booking Status & Return Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Booking Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                  >
                    <option value="Active">Active (Handed Over / Out)</option>
                    <option value="Reserved">Reserved (Upcoming Booking)</option>
                    <option value="Returned">Returned (Back in Stock)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Actual Return Date</label>
                  <input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>
            </div>

            {/* Handover & Condition Notes */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Handover Notes</h2>
              <div>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm min-h-[90px]"
                  placeholder="Included 2x Batteries, Charger, Lens Cap, Hard Case..."
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Dates & Pricing */}
          <div className="space-y-6">
            {/* Rental Dates & Calculation */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Rental Dates & Duration</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => handleDatesChange(e.target.value, formData.end_date)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => handleDatesChange(formData.start_date, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.rental_days}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 1;
                    setFormData({ ...formData, rental_days: days });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                />
              </div>

              {/* Date Clash Alert Banner */}
              {hasAnyClash && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-400 block mb-0.5">Booking Schedule Conflict</span>
                    <span>
                      The selected dates clash with another booking for one or more selected items. Review the equipment alerts on the left.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & Financials */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white">Pricing & Financials</h2>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Security Deposit (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white text-sm"
                  placeholder="0.00"
                />
              </div>

              {/* Grand Total Display */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-brand-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Combined Total Amount</span>
                  <span className="text-xs text-brand-400 font-medium">
                    {items.length} {items.length === 1 ? "item" : "items"} • {formData.rental_days}{" "}
                    {formData.rental_days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{formatLKR(grandTotal)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-400 block text-xs">Payment Recorded</span>
                  <span className="font-bold text-green-400">
                    {formatLKR(parseFloat(formData.paid_amount) || 0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-xs">Payment Status</span>
                  <span className="font-semibold text-white capitalize">{formData.payment_status}</span>
                </div>
              </div>
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
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
