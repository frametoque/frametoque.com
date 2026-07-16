"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, DollarSign, Image, FilePenLine, Trash2, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchLiveNotifications, NotificationItem } from "../actions/notifications";

let prefsCache: Record<string, { read: boolean; deleted: boolean }> | null = null;

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr).getTime();
  const diffMs = Date.now() - date;
  const diffSec = Math.round(diffMs / 1000);

  // Future date (e.g. an upcoming deadline)
  if (diffSec < 0) {
    const abs = Math.abs(diffSec);
    if (abs < 3600) return `in ${Math.max(1, Math.round(abs / 60))} min${abs >= 120 ? "s" : ""}`;
    if (abs < 86400) return `in ${Math.round(abs / 3600)} hr${abs >= 7200 ? "s" : ""}`;
    return `in ${Math.round(abs / 86400)} day${abs >= 172800 ? "s" : ""}`;
  }

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min${diffSec >= 120 ? "s" : ""} ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr${diffSec >= 7200 ? "s" : ""} ago`;
  if (diffSec < 604800) return `${Math.round(diffSec / 86400)} day${diffSec >= 172800 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0); // re-renders so "time ago" labels stay fresh
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initCache = () => {
    if (!prefsCache) {
      const localPrefsStr = typeof window !== "undefined" ? localStorage.getItem("ft_notification_prefs") : null;
      prefsCache = localPrefsStr ? JSON.parse(localPrefsStr) : {};
    }
    return prefsCache!;
  };

  const sortByRecency = (list: NotificationItem[]) =>
    [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const loadNotifications = useCallback(async (isBackground = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (!isBackground) setLoading(true);

      const liveData = await fetchLiveNotifications();
      const currentPrefs = initCache();

      const processed = sortByRecency(
        liveData
          .map((n: NotificationItem) => {
            const pref = currentPrefs[n.id] || {};
            return {
              ...n,
              read: pref.read !== undefined ? pref.read : n.read,
              deleted: pref.deleted || false
            };
          })
          .filter((n: NotificationItem & { deleted?: boolean }) => !n.deleted)
      );

      setNotifications(prev => {
        const hasChanged =
          prev.length !== processed.length ||
          prev.some((p, i) => p.id !== processed[i].id || p.read !== processed[i].read);
        return hasChanged ? processed : prev;
      });

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to load notifications:", err);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      loadNotifications();
    }, 3000);

    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadNotifications(true);
      }
    }, 15000);

    // Keep relative timestamps ("3 mins ago") fresh without a full refetch
    const tickInterval = setInterval(() => forceTick(t => t + 1), 60000);

    return () => {
      clearTimeout(initialDelay);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearInterval(tickInterval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadNotifications]);

  const savePrefs = useCallback((updatedList: (NotificationItem & { deleted?: boolean })[]) => {
    const currentPrefs = initCache();
    updatedList.forEach(n => {
      currentPrefs[n.id] = { read: n.read, deleted: n.deleted || false };
    });
    localStorage.setItem("ft_notification_prefs", JSON.stringify(currentPrefs));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      savePrefs(updated);
      return updated;
    });
  };

  const toggleRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: !n.read } : n);
      savePrefs(updated);
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      savePrefs(updated);
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item) savePrefs([{ ...item, deleted: true }]);
      return prev.filter(n => n.id !== id);
    });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "finance": return <DollarSign className="w-4 h-4 text-green-400" />;
      case "project": return <Image className="w-4 h-4 text-brand-400" />;
      case "agreement": return <FilePenLine className="w-4 h-4 text-blue-400" />;
      case "analytics": return <TrendingUp className="w-4 h-4 text-orange-400" />;
      default: return <Calendar className="w-4 h-4 text-purple-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "finance": return "bg-green-400/10 border border-green-500/20";
      case "project": return "bg-brand-400/10 border border-brand-500/20";
      case "agreement": return "bg-blue-400/10 border border-blue-500/20";
      case "analytics": return "bg-orange-400/10 border border-orange-500/20";
      default: return "bg-purple-400/10 border border-purple-500/20";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) loadNotifications(true);
        }}
        className="relative p-2 hover:bg-white/10 rounded-3xl transition-colors cursor-pointer text-gray-300 hover:text-white"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-black">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0E0E11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/3">
              <div>
                <h3 className="text-sm font-bold text-white">Notification Center</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{unreadCount} unread updates</p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                {loading && (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                )}
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto scrollbar-custom divide-y divide-white/5 min-h-0">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex gap-3 p-4 transition-colors relative group ${item.link ? "cursor-pointer" : ""} ${
                    item.read ? "hover:bg-white/3" : "bg-brand-500/3 hover:bg-brand-500/5"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${getBgColor(item.type)}`}>
                      {getIcon(item.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 justify-between">
                      <p className={`text-xs font-bold truncate ${item.read ? "text-gray-400" : "text-white"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${item.read ? "text-gray-500" : "text-gray-300"}`}>
                      {item.message}
                    </p>
                  </div>

                  <div className="absolute right-3 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRead(item.id); }}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        item.read
                          ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                          : "bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 hover:text-brand-300"
                      }`}
                      title={item.read ? "Mark as unread" : "Mark as read"}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(item.id); }}
                      className="p-1 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {!item.read && (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-500 rounded-full group-hover:opacity-0 transition-opacity" />
                  )}
                </div>
              ))}

              {notifications.length === 0 && !loading && (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">All caught up!</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">No new notifications to show.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(NotificationBell);