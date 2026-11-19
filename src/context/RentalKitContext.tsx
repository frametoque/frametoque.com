"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

export interface RentalKitItem {
  id: string;
  slug: string;
  item_name: string;
  category: string;
  daily_rate: number;
  image_url: string | null;
  quantity: number;
}

interface RentalKitContextType {
  items: RentalKitItem[];
  addToKit: (item: Omit<RentalKitItem, "quantity">, quantity?: number) => void;
  removeFromKit: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearKit: () => void;
  isInKit: (id: string) => boolean;
  itemCount: number;
  dailySubtotal: number;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  totalDays: number;
  estimatedTotal: number;
  isOpen: boolean;
  openKit: () => void;
  closeKit: () => void;
  toggleKit: () => void;
}

const RentalKitContext = createContext<RentalKitContextType | undefined>(undefined);

export function RentalKitProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RentalKitItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Shoot Dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [startDate, setStartDate] = useState<string>(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(tomorrow.toISOString().split("T")[0]);

  // Load kit from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ft_shoot_kit");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        // Ignore parse error
      }
    }
    const savedDates = localStorage.getItem("ft_shoot_kit_dates");
    if (savedDates) {
      try {
        const { start, end } = JSON.parse(savedDates);
        if (start) setStartDate(start);
        if (end) setEndDate(end);
      } catch {
        // Ignore
      }
    }
    setIsLoaded(true);
  }, []);

  // Save kit to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("ft_shoot_kit", JSON.stringify(items));
      localStorage.setItem("ft_shoot_kit_dates", JSON.stringify({ start: startDate, end: endDate }));
    }
  }, [items, startDate, endDate, isLoaded]);

  const addToKit = (item: Omit<RentalKitItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setIsOpen(true);
  };

  const removeFromKit = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromKit(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearKit = () => {
    setItems([]);
  };

  const isInKit = (id: string) => {
    return items.some((i) => i.id === id);
  };

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const dailySubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.daily_rate * item.quantity, 0);
  }, [items]);

  const totalDays = useMemo(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate || startDate);
      const diff = Math.max(0, e.getTime() - s.getTime());
      return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
    } catch {
      return 1;
    }
  }, [startDate, endDate]);

  const estimatedTotal = useMemo(() => {
    return dailySubtotal * totalDays;
  }, [dailySubtotal, totalDays]);

  return (
    <RentalKitContext.Provider
      value={{
        items,
        addToKit,
        removeFromKit,
        updateQuantity,
        clearKit,
        isInKit,
        itemCount,
        dailySubtotal,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        totalDays,
        estimatedTotal,
        isOpen,
        openKit: () => setIsOpen(true),
        closeKit: () => setIsOpen(false),
        toggleKit: () => setIsOpen((prev) => !prev),
      }}
    >
      {children}
    </RentalKitContext.Provider>
  );
}

export function useRentalKit() {
  const context = useContext(RentalKitContext);
  if (!context) {
    throw new Error("useRentalKit must be used within a RentalKitProvider");
  }
  return context;
}
