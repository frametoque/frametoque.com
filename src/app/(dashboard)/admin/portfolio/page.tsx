"use client";
const EMPTY_ITEMS: any[] = [];

import { useEffect, useState, useRef, useMemo } from "react";
import useSWR from 'swr';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  X,
  Loader2,
  UploadCloud,
  Layers,
  Globe,
  ExternalLink,
  Video,
  Camera,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import {
  getPortfolioByCategory,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  uploadPortfolioMediaFromUrl,
  uploadPortfolioMediaWithDimensions,
  createBatchPortfolioPhotos,
  reorderPortfolioItems,
  reorderPortfolioItemsBatch,
  reorderEventPhotosBatch,
  cleanDuplicatesFromEvent
} from "../actions/portfolioActions";

/**
 * Executes async tasks with a controlled concurrency limit and retry capability per task.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ results: (R | null)[]; errors: { index: number; error: any }[] }> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  const errors: { index: number; error: any }[] = [];
  let completed = 0;
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      const item = items[idx];
      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        try {
          attempts++;
          const res = await fn(item, idx);
          results[idx] = res;
          success = true;
        } catch (err: any) {
          if (attempts >= 3) {
            console.error(`Item ${idx} failed after 3 attempts:`, err);
            errors.push({ index: idx, error: err });
          } else {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }

      completed++;
      if (onProgress) {
        onProgress(completed, items.length);
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return { results, errors };
}

// Map slugs to categories
const CATEGORIES = [
  { slug: "photography", name: "Photography" },
  { slug: "videography", name: "Videography" },
  { slug: "video-editing", name: "Video Editing" },
  { slug: "graphic-design", name: "Graphic Design" },
  { slug: "web-dev", name: "Web Development" },

];

const defaultForm = {
  domain: "",
  image_path: "",
  title: "",
  description: "",
  techs: [] as string[],
  url: "",
  event_name: "",
  src: "",
  width: "",
  height: ""
};

// YouTube Video ID extraction helper
function getYouTubeId(url: string) {
  if (!url) return null;
  
  if (url.includes("/shorts/")) {
    const parts = url.split("/shorts/");
    if (parts[1]) {
      const id = parts[1].split(/[?&#]/)[0];
      if (id.length === 11) return id;
    }
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Global cache for video titles to prevent layout thrashing and repeated API calls
const youtubeTitleCache: Record<string, string> = {};

function YouTubeVideoTitle({ url }: { url: string }) {
  const [title, setTitle] = useState(youtubeTitleCache[url] || "Loading video title...");

  useEffect(() => {
    if (!url) return;
    if (youtubeTitleCache[url]) {
      setTitle(youtubeTitleCache[url]);
      return;
    }

    const ytId = getYouTubeId(url);
    const targetUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : url;

    fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        const t = data.title || "YouTube Video";
        youtubeTitleCache[url] = t;
        setTitle(t);
      })
      .catch(() => {
        setTitle("YouTube Video");
      });
  }, [url]);

  return <span className="font-semibold text-white text-sm block leading-relaxed">{title}</span>;
}

export default function PortfolioAdminPage() {
  const [activeCategory, setActiveCategory] = useState("photography");

  // Modals controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  // Photography sub-manager state
  const [photoSubManagerEvent, setPhotoSubManagerEvent] = useState<string | null>(null);

  // Screenshot generation states
  const [generatingScreenshots, setGeneratingScreenshots] = useState(false);
  const [suggestedScreenshots, setSuggestedScreenshots] = useState<{ name: string; url: string }[]>([]);

  // Upload/Saving states
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subFileInputRef = useRef<HTMLInputElement>(null);
  const photoDropInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload queue state
  type BulkFileStatus = "queued" | "uploading" | "done" | "error";
  type BulkFileEntry = { name: string; status: BulkFileStatus; error?: string };
  const [bulkQueue, setBulkQueue] = useState<BulkFileEntry[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fetcher = async () => {
    const res = await getPortfolioByCategory(activeCategory);
    return { items: res };
  };

  const { data: swrData, isLoading: loading, mutate: reloadItems } = useSWR(["portfolio", activeCategory], fetcher);
  const { items = EMPTY_ITEMS } = swrData || {};

  const loadItems = async () => {
    await reloadItems();
  };


  // New photography event staging state
  type StagedPhoto = { file: File; previewUrl: string; width?: number; height?: number; name: string; hash?: string };
  const [photoNewEventName, setPhotoNewEventName] = useState("");
  const [photoStagedFiles, setPhotoStagedFiles] = useState<StagedPhoto[]>([]);
  
  // Progress tracking for photography saving
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Drag and Drop reordering states
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [dragItems, setDragItems] = useState<any[]>([]);
  const [dragEvents, setDragEvents] = useState<any[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Sub-event photos reordering state
  const [subEventPhotos, setSubEventPhotos] = useState<any[]>([]);
  const [draggingSubPhotoIdx, setDraggingSubPhotoIdx] = useState<number | null>(null);
  const [savingSubPhotoOrder, setSavingSubPhotoOrder] = useState(false);
  const [hasReorderedSubPhotos, setHasReorderedSubPhotos] = useState(false);

  useEffect(() => {
    if (photoSubManagerEvent) {
      const list = items.filter(img => img.event_name === photoSubManagerEvent);
      setSubEventPhotos(list);
      setHasReorderedSubPhotos(false);
    } else {
      setSubEventPhotos([]);
      setHasReorderedSubPhotos(false);
    }
  }, [photoSubManagerEvent, items]);

  const hasSubEventDuplicates = useMemo(() => {
    if (!subEventPhotos || subEventPhotos.length <= 1) return false;
    const seen = new Set<string>();
    for (const photo of subEventPhotos) {
      let key = "";
      if (photo.file_hash) {
        key = `hash:${photo.file_hash}`;
      } else if (photo.original_filename) {
        key = `name:${photo.original_filename.toLowerCase()}`;
      } else if (photo.src) {
        const decoded = decodeURIComponent(photo.src);
        const basename = decoded.split('/').pop() || "";
        const cleanName = basename.replace(/^[0-9a-fA-F]{12}-/, "").replace(/^\d+-/, "");
        key = `name:${cleanName.toLowerCase()}`;
      } else {
        key = `id:${photo.id}`;
      }
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [subEventPhotos]);

  const handleSubPhotoDragStart = (e: React.DragEvent, index: number) => {
    setDraggingSubPhotoIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSubPhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingSubPhotoIdx === null || draggingSubPhotoIdx === index) return;
    const list = [...subEventPhotos];
    const dragged = list[draggingSubPhotoIdx];
    list.splice(draggingSubPhotoIdx, 1);
    list.splice(index, 0, dragged);
    setDraggingSubPhotoIdx(index);
    setSubEventPhotos(list);
    setHasReorderedSubPhotos(true);
  };

  const handleSubPhotoDragEnd = () => {
    setDraggingSubPhotoIdx(null);
  };

  const handleSaveSubPhotoOrder = async () => {
    setSavingSubPhotoOrder(true);
    try {
      const orderedIds = subEventPhotos.map(p => p.id);
      await reorderEventPhotosBatch(orderedIds);
      setHasReorderedSubPhotos(false);
      await loadItems();
    } catch (err) {
      console.error("Failed to save reordered photos:", err);
      alert("Failed to save the new photo order.");
    } finally {
      setSavingSubPhotoOrder(false);
    }
  };
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const handleCleanDuplicates = async () => {
    if (!photoSubManagerEvent) return;
    setCleaningDuplicates(true);
    try {
      const res = await cleanDuplicatesFromEvent(photoSubManagerEvent);
      alert(`Deduplication complete!\nKept: ${res.kept} photos\nDeleted: ${res.deleted} duplicate photos from database & Vercel Blob CDN.`);
      await loadItems();
    } catch (err) {
      console.error("Failed to clean duplicates:", err);
      alert("Failed to clean duplicates.");
    } finally {
      setCleaningDuplicates(false);
    }
  };

  useEffect(() => {
    setIsReorderMode(false);
    setDragItems(items);
    if (activeCategory === "photography") {
      const groups = new Map<string, any[]>();
      for (const item of items) {
        const name = item.event_name || "Uncategorized";
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(item);
      }
      const eventList = Array.from(groups.entries()).map(([name, images]) => ({
        name,
        images,
        id: images[0]?.event_id
      }));
      setDragEvents(eventList);
    }
  }, [items, activeCategory]);

  const handleGenerateScreenshots = () => {
    if (!formData.url.trim()) {
      alert("Please enter a valid URL Link first.");
      return;
    }
    const cleanUrl = formData.url.trim();
    if (!cleanUrl.startsWith("http")) {
      alert("URL must start with http:// or https://");
      return;
    }

    setGeneratingScreenshots(true);
    try {
      const encoded = encodeURIComponent(cleanUrl);
      const frames = [
        {
          name: "1s Delay (Desktop 16:9)",
          url: `/api/admin/screenshot?url=${encoded}&delay=1000`
        },
        {
          name: "2s Delay (Desktop 16:9)",
          url: `/api/admin/screenshot?url=${encoded}&delay=2000`
        },
        {
          name: "3s Delay (Desktop 16:9)",
          url: `/api/admin/screenshot?url=${encoded}&delay=3000`
        },
        {
          name: "4s Delay (Desktop 16:9)",
          url: `/api/admin/screenshot?url=${encoded}&delay=4000`
        },
        {
          name: "5s Delay (Desktop 16:9)",
          url: `/api/admin/screenshot?url=${encoded}&delay=5000`
        }
      ];
      setSuggestedScreenshots(frames);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingScreenshots(false);
    }
  };

  const handleSelectScreenshot = async (url: string) => {
    setUploadingImage(true);
    try {
      const localPath = await uploadPortfolioMediaFromUrl(url);
      setFormData((prev) => ({ ...prev, image_path: localPath }));
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      alert("Failed to capture and download screenshot. Please upload a file manually.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    let parsedDomain = "";
    if (rawVal) {
      try {
        let cleanUrl = rawVal.trim();
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
          cleanUrl = "https://" + cleanUrl;
        }
        const hostname = new URL(cleanUrl).hostname;
        parsedDomain = hostname.replace(/^www\./, "");
      } catch (err) {
        const match = rawVal.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/);
        parsedDomain = match ? match[1] : rawVal;
      }
    }
    setFormData((prev) => ({
      ...prev,
      url: rawVal,
      domain: parsedDomain
    }));
  };

  // Lock scroll in document/body when modal is open
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || photoSubManagerEvent !== null;
    if (isAnyModalOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isModalOpen, photoSubManagerEvent]);

  // Form input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Technologies comma separation helper (for web-dev)
  const handleTechChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.value.split(",").map((tech) => tech.trim());
    setFormData((prev) => ({ ...prev, techs: list }));
  };

  // Image upload with dimension calculations for photography events
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const url = await uploadPortfolioMedia(uploadData, activeCategory);

      if (activeCategory === "photography") {
        const img = new Image();
        img.onload = () => {
          setFormData((prev) => ({
            ...prev,
            src: url,
            width: String(img.naturalWidth),
            height: String(img.naturalHeight)
          }));
        };
        img.src = URL.createObjectURL(file);
      } else {
        setFormData((prev) => ({ ...prev, image_path: url }));
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload image under the sub-manager event directly
  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !photoSubManagerEvent) return;

    // Reset input so same files can be re-selected after
    e.target.value = "";

    // Initialise queue entries
    const initialQueue: { name: string; status: "queued" | "uploading" | "done" | "error"; error?: string }[] = files.map(f => ({
      name: f.name,
      status: "queued"
    }));
    setBulkQueue(initialQueue);
    setBulkUploading(true);

    const eventName = photoSubManagerEvent;

    const { results, errors } = await runWithConcurrency(
      files,
      4, // 4 parallel concurrent uploads
      async (file, idx) => {
        setBulkQueue(prev => prev.map((entry, i) => i === idx ? { ...entry, status: "uploading" } : entry));
        const uploadData = new FormData();
        uploadData.append("file", file);
        const res = await uploadPortfolioMediaWithDimensions(uploadData, eventName);
        setBulkQueue(prev => prev.map((entry, i) => i === idx ? { ...entry, status: "done" } : entry));
        return res;
      }
    );

    // Update error state for failed items
    if (errors.length > 0) {
      errors.forEach(({ index, error }) => {
        setBulkQueue(prev => prev.map((entry, i) =>
          i === index ? { ...entry, status: "error", error: error?.message || "Upload failed" } : entry
        ));
      });
    }

    const successfulPhotos = results.filter((r): r is { url: string; width: number; height: number; hash: string; filename: string } => r !== null).map(r => ({
      src: r.url,
      width: r.width,
      height: r.height,
      hash: r.hash,
      filename: r.filename
    }));

    if (successfulPhotos.length > 0) {
      try {
        await createBatchPortfolioPhotos(eventName, successfulPhotos);
      } catch (err) {
        console.error("Failed to batch save DB items for sub-event:", err);
      }
    }

    setBulkUploading(false);
    await loadItems();
  };

  // Delete specific photo from sub-manager event
  const handleDeletePhotoFromSubEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this photo from the event category?")) return;
    try {
      await deletePortfolioItem("photography", id);
      await loadItems();
    } catch (err) {
      console.error("Failed to delete photo from event:", err);
      alert("Failed to delete photo.");
    }
  };

  // Delete an entire event category (and all its nested photos)
  const handleDeleteEvent = async (eventName: string, imageCount: number) => {
    if (!confirm(`Delete event "${eventName}" and all its ${imageCount} photos? This cannot be undone.`)) return;

    setSaving(true);
    try {
      const eventImages = items.filter(img => img.event_name === eventName);
      for (const img of eventImages) {
        await deletePortfolioItem("photography", img.id);
      }
      await loadItems();
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event photos.");
    } finally {
      setSaving(false);
    }
  };

  // Modal triggers
  // Drag & drop handlers for rows
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === index) return;
    
    if (activeCategory === "photography") {
      const list = [...dragEvents];
      const draggedItem = list[draggingIdx];
      list.splice(draggingIdx, 1);
      list.splice(index, 0, draggedItem);
      setDraggingIdx(index);
      setDragEvents(list);
    } else {
      const list = [...dragItems];
      const draggedItem = list[draggingIdx];
      list.splice(draggingIdx, 1);
      list.splice(index, 0, draggedItem);
      setDraggingIdx(index);
      setDragItems(list);
    }
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  // Save the custom dragged order to database
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      let orderedIds: number[] = [];
      if (activeCategory === "photography") {
        // Map to event database IDs
        orderedIds = dragEvents.map(evt => evt.id);
      } else {
        orderedIds = dragItems.map(item => item.id);
      }
      await reorderPortfolioItemsBatch(activeCategory, orderedIds);
      setIsReorderMode(false);
      await loadItems();
    } catch (err) {
      console.error("Failed to save reordered items:", err);
      alert("Failed to save the new order. Check logs.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setDragItems(items);
    
    // Recompute dragEvents from original items
    const groups = new Map<string, any[]>();
    for (const item of items) {
      const name = item.event_name || "Uncategorized";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(item);
    }
    const eventList = Array.from(groups.entries()).map(([name, images]) => ({
      name,
      images,
      id: images[0]?.event_id
    }));
    setDragEvents(eventList);
  };

  const openNew = () => {
    setEditingId(null);
    setSuggestedScreenshots([]);
    setPhotoNewEventName("");
    setPhotoStagedFiles([]);
    setFormData({
      ...defaultForm,
      src: "",
      image_path: activeCategory === "web-dev" || activeCategory === "graphic-design" ? "/projects/web/default.png" : ""
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setSuggestedScreenshots([]);
    setFormData({
      domain: item.domain || "",
      image_path: item.image_path || "",
      title: item.title || "",
      description: item.description || "",
      techs: Array.isArray(item.techs) ? item.techs : [],
      url: item.url || "",
      event_name: item.event_name || "",
      src: item.src || "",
      width: item.width ? String(item.width) : "",
      height: item.height ? String(item.height) : ""
    });
    setIsModalOpen(true);
  };

  // Saving data
  const handleSave = async () => {
    // Basic validation based on category
    if (activeCategory === "web-dev") {
      if (!formData.title.trim()) return alert("Project title is required.");
      if (!formData.domain.trim()) return alert("Domain name is required.");
    } else if (activeCategory === "graphic-design") {
      if (!formData.image_path.trim()) return alert("Image path or YouTube Video link is required.");
    } else if (activeCategory === "video-editing" || activeCategory === "videography") {
      if (!formData.url.trim()) return alert("Video URL is required.");
    }
    // Photography uses its own handleSaveNewPhotoEvent — skip here

    setSaving(true);
    try {
      if (editingId !== null) {
        await updatePortfolioItem(activeCategory, editingId, formData);
      } else {
        await createPortfolioItem(activeCategory, formData);
      }
      setIsModalOpen(false);
      await loadItems();
    } catch (err) {
      console.error("Failed to save portfolio item:", err);
      alert("Failed to save portfolio item. Check logs.");
    } finally {
      setSaving(false);
    }
  };

  // Stage selected files for photography bulk upload (client-side preview, no server call yet)
  const handleStageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    const stagedList: StagedPhoto[] = [];
    for (const file of fileArray) {
      let hash = "";
      try {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      } catch (err) {
        hash = `${file.name}-${file.size}-${file.lastModified}`;
      }
      stagedList.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        hash
      });
    }

    setPhotoStagedFiles(prev => {
      const map = new Map<string, StagedPhoto>();
      prev.forEach(item => {
        const key = item.hash || item.name;
        map.set(key, item);
      });
      stagedList.forEach(item => {
        const key = item.hash || item.name;
        map.set(key, item);
      });
      return Array.from(map.values());
    });
  };

  // Upload all staged photos and create DB rows
  const handleSaveNewPhotoEvent = async () => {
    if (!photoNewEventName.trim()) return alert("Please enter an event name.");
    if (photoStagedFiles.length === 0) return alert("Please select at least one photo.");

    setSaving(true);
    setPhotoUploadProgress({ current: 0, total: photoStagedFiles.length });

    try {
      const eventName = photoNewEventName.trim();
      const { results, errors } = await runWithConcurrency(
        photoStagedFiles,
        4, // 4 parallel concurrent uploads
        async (staged) => {
          const uploadData = new FormData();
          uploadData.append("file", staged.file);
          return await uploadPortfolioMediaWithDimensions(uploadData, eventName);
        },
        (current, total) => {
          setPhotoUploadProgress({ current, total });
        }
      );

      const successfulPhotos = results
        .filter((r): r is { url: string; width: number; height: number; hash: string; filename: string } => r !== null)
        .map(r => ({
          src: r.url,
          width: r.width,
          height: r.height,
          hash: r.hash,
          filename: r.filename
        }));

      if (successfulPhotos.length > 0) {
        await createBatchPortfolioPhotos(eventName, successfulPhotos);
      }

      if (errors.length > 0) {
        alert(`Uploaded ${successfulPhotos.length} out of ${photoStagedFiles.length} photos. ${errors.length} photo(s) failed after retries.`);
      }

      setIsModalOpen(false);
      setPhotoStagedFiles([]);
      setPhotoNewEventName("");
      await loadItems();
    } catch (err) {
      console.error("Failed to save photos:", err);
      alert("Failed to save photos. Check logs.");
    } finally {
      setSaving(false);
      setPhotoUploadProgress(null);
    }
  };

  // Group photography items by event category name
  const groupedPhotography = useMemo(() => {
    if (activeCategory !== "photography") return [];
    const groups = new Map<string, any[]>();
    for (const item of items) {
      const name = item.event_name || "Uncategorized";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(item);
    }
    return Array.from(groups.entries()).map(([name, images]) => ({
      name,
      images,
      id: images[0]?.id
    }));
  }, [activeCategory, items]);

  // Retrieve current photos list inside sub-manager event
  const subEventImages = items.filter(img => img.event_name === photoSubManagerEvent);

  return (
    <div className="space-y-6 text-white bg-black min-h-screen">

      {/* Category Tabs & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === cat.slug
                  ? "bg-white text-black border-white shadow-md font-bold"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap self-end lg:self-auto">
          {isReorderMode ? (
            <>
              <button
                onClick={handleCancelReorder}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-3xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : "Save Order"}
              </button>
            </>
          ) : (
            <>
              {items.length > 1 && (
                <button
                  onClick={() => setIsReorderMode(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-3xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4" /> Change Order
                </button>
              )}
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors whitespace-nowrap text-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Item
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
              <div className="h-6 bg-white/10 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {/* Dynamic Headers based on Active Category */}
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  {isReorderMode && <th className="p-4 w-10"></th>}
                  {activeCategory === "web-dev" && (
                    <>
                      <th className="p-4 font-medium">Project</th>
                      <th className="p-4 font-medium">Domain & Link</th>
                      <th className="p-4 font-medium hidden md:table-cell">Technologies</th>
                    </>
                  )}
                  {activeCategory === "graphic-design" && (
                    <>
                      <th className="p-4 font-medium">Preview</th>
                      <th className="p-4 font-medium">Media Source</th>
                    </>
                  )}
                  {(activeCategory === "video-editing" || activeCategory === "videography") && (
                    <>
                      <th className="p-4 font-medium">Thumbnail</th>
                      <th className="p-4 font-medium">Details & Link</th>
                    </>
                  )}
                  {activeCategory === "photography" && (
                    <>
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium">Image Count</th>
                      <th className="p-4 font-medium hidden sm:table-cell">Previews</th>
                    </>
                  )}
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>

              {/* Dynamic Rows */}
              <tbody className="divide-y divide-white/5">
                {/* PHOTOGRAPHY (Grouped Category View) */}
                {activeCategory === "photography" && (
                  dragEvents.map((event, idx) => (
                    <tr
                      key={event.name}
                      draggable={isReorderMode}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-white/5 transition-colors group ${
                        isReorderMode ? "cursor-move select-none" : ""
                      } ${draggingIdx === idx ? "opacity-40 bg-white/10" : ""}`}
                    >
                      {isReorderMode && (
                        <td className="p-4 w-10 text-gray-500 group-hover:text-gray-300">
                          <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                        </td>
                      )}
                      <td className="p-4 text-sm font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{event.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold">
                          {event.images.length} photos
                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 overflow-hidden max-w-xs">
                          {event.images.slice(0, 4).map((img: any) => (
                            <div key={img.id} className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0">
                              <img src={img.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {event.images.length > 4 && (
                            <span className="text-xs text-gray-500 font-semibold ml-1">
                              +{event.images.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPhotoSubManagerEvent(event.name)}
                            disabled={isReorderMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/10 hover:bg-brand-600 text-brand-400 hover:text-white rounded-2xl text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Manage Photos
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.name, event.images.length)}
                            disabled={isReorderMode}
                            className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-full text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {/* OTHER STANDARD CATEGORIES */}
                {activeCategory !== "photography" && dragItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    draggable={isReorderMode}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-white/5 transition-colors group ${
                      isReorderMode ? "cursor-move select-none" : ""
                    } ${draggingIdx === idx ? "opacity-40 bg-white/10" : ""}`}
                  >
                    {isReorderMode && (
                      <td className="p-4 w-10 text-gray-500 group-hover:text-gray-300">
                        <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                      </td>
                    )}
                    
                    {/* WEB DEVELOPMENT */}
                    {activeCategory === "web-dev" && (
                      <>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0">
                              <img
                                src={item.image_path || "/projects/web/default.png"}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-semibold text-white text-sm truncate max-w-xs">{item.title}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {item.url ? (
                            <Link href={item.url} target="_blank" className="text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1.5">
                              {item.domain || "Visit Site"}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-gray-400">{item.domain}</span>
                          )}
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {item.techs?.slice(0, 3).map((tech: string, idx: number) => (
                              <span key={idx} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                                {tech}
                              </span>
                            ))}
                            {item.techs?.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{item.techs.length - 3}</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {/* GRAPHIC DESIGN */}
                    {activeCategory === "graphic-design" && (
                      <>
                        <td className="p-4">
                          <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
                            {getYouTubeId(item.image_path) ? (
                              <img
                                src={`https://img.youtube.com/vi/${getYouTubeId(item.image_path)}/mqdefault.jpg`}
                                alt="Graphic design YouTube preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={item.image_path}
                                alt="Graphic design preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-400 truncate max-w-md" title={item.image_path}>
                          {getYouTubeId(item.image_path) ? (
                            <div className="flex flex-col">
                              <YouTubeVideoTitle url={item.image_path} />
                              <span className="text-[10px] text-brand-400 truncate mt-0.5">{item.image_path}</span>
                            </div>
                          ) : (
                            item.image_path
                          )}
                        </td>
                      </>
                    )}

                    {/* VIDEO EDITING & VIDEOGRAPHY */}
                    {(activeCategory === "video-editing" || activeCategory === "videography") && (
                      <>
                        <td className="p-4">
                          <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0 flex items-center justify-center">
                            {getYouTubeId(item.url) ? (
                              <img
                                src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg`}
                                alt="Video Thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Video className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-300">
                          {getYouTubeId(item.url) ? (
                            <div className="flex flex-col">
                              <YouTubeVideoTitle url={item.url} />
                              <span className="text-[10px] text-brand-400 truncate mt-0.5">{item.url}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{item.url}</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* ACTIONS (NON-PHOTOGRAPHY) */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isReorderMode && (item.url || item.src || item.image_path) && (
                          <Link
                            href={item.url || item.src || item.image_path}
                            target="_blank"
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Open Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          disabled={isReorderMode}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const displayName = item.title || item.event_name || item.domain || item.url || "Item";
                            if (!confirm(`Delete "${displayName}"? This cannot be undone.`)) return;
                            deletePortfolioItem(activeCategory, item.id).then(() => loadItems());
                          }}
                          disabled={isReorderMode}
                          className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-full text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      No items registered in this category. Click "Add Item" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog (Add / Edit Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" data-lenis-prevent>
          <div className="bg-black border border-white/10 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overscroll-contain overflow-hidden" data-lenis-prevent>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId !== null ? "Edit Portfolio Item" : "Add Portfolio Item"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Category: <span className="text-brand-400 font-semibold">{CATEGORIES.find(c => c.slug === activeCategory)?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain min-h-0" data-lenis-prevent>
              
              {/* ADAPTIVE FORM: WEB DEVELOPMENT */}
              {activeCategory === "web-dev" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleTextChange}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL Link / Website Address *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="url"
                          value={formData.url}
                          onChange={handleUrlInputChange}
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateScreenshots}
                          disabled={generatingScreenshots}
                          className="px-4 bg-brand-600/10 hover:bg-brand-600 text-brand-400 hover:text-white border border-brand-500/20 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                        >
                          {generatingScreenshots ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                          Get Frames
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technologies (comma separated)</label>
                      <input
                        type="text"
                        value={formData.techs.join(", ")}
                        onChange={handleTechChange}
                        placeholder="Next.js, Tailwind CSS, React"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Image Preview</label>
                      <div className="border border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4 bg-white/5 hover:border-brand-500/50 transition-colors relative min-h-[160px]">
                        {formData.image_path ? (
                          <div className="w-full h-36 rounded-xl overflow-hidden relative group">
                            <img src={formData.image_path} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                              >
                                Change Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-gray-400" />
                            <p className="text-xs text-gray-500">PNG or JPG up to 10MB</p>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                            >
                              Browse Files
                            </button>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/75 rounded-2xl flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                            <span className="text-xs">Uploading...</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        name="image_path"
                        value={formData.image_path}
                        onChange={handleTextChange}
                        placeholder="/projects/web/default.png"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-brand-500 outline-none text-gray-300 mt-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleTextChange}
                        placeholder="Details about project goals and deliverables..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {suggestedScreenshots.length > 0 && (
                    <div className="col-span-1 md:col-span-2 border-t border-white/10 pt-6">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Suggested Viewport Frames (Click one to select)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {suggestedScreenshots.map((frame, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectScreenshot(frame.url)}
                            disabled={uploadingImage}
                            className="group flex flex-col bg-white/5 border border-white/10 hover:border-brand-500/50 rounded-xl overflow-hidden text-left transition-all p-1.5 focus:outline-none disabled:opacity-50 cursor-pointer"
                          >
                            <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center">
                              <img
                                src={frame.url}
                                alt={frame.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] bg-brand-600 text-white font-bold px-2 py-0.5 rounded-full">Apply</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-300 font-semibold mt-1.5 px-1 truncate block">{frame.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ADAPTIVE FORM: GRAPHIC DESIGN */}
              {activeCategory === "graphic-design" && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">YouTube Video URL (Alternative)</label>
                    <input
                      type="text"
                      name="image_path"
                      value={formData.image_path.startsWith("http") && getYouTubeId(formData.image_path) ? formData.image_path : ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_path: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-500 mt-2">Paste a YouTube link here to feature a design reel, or upload an image file below.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Or Upload Image File *</label>
                    <div className="border border-dashed border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 bg-white/5 hover:border-brand-500/50 transition-colors relative min-h-[220px]">
                      {formData.image_path && !getYouTubeId(formData.image_path) ? (
                        <div className="w-full h-44 rounded-xl overflow-hidden relative group">
                          <img src={formData.image_path} alt="Graphic design preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                            >
                              Change Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-gray-400" />
                          <p className="text-xs text-gray-500">Select graphic layout file</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                          >
                            Browse Files
                          </button>
                        </>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/75 rounded-2xl flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                          <span className="text-xs">Uploading...</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      name="image_path"
                      value={formData.image_path}
                      onChange={handleTextChange}
                      placeholder="/projects/graphic/default.png"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-brand-500 outline-none text-gray-300 mt-3"
                    />
                  </div>
                </div>
              )}

              {/* ADAPTIVE FORM: VIDEO EDITING & VIDEOGRAPHY */}
              {(activeCategory === "video-editing" || activeCategory === "videography") && (
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">YouTube URL / Share Link *</label>
                    <input
                      type="text"
                      name="url"
                      value={formData.url}
                      onChange={handleTextChange}
                      placeholder="https://youtu.be/..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-500 mt-2">Provide the standard YouTube or social media resource video URL.</p>
                  </div>
                </div>
              )}

              {/* ADAPTIVE FORM: PHOTOGRAPHY — Bulk Upload New Event */}
              {activeCategory === "photography" && (
                <div className="flex flex-col gap-6">
                  {/* Event Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Event / Category Name *</label>
                    <input
                      type="text"
                      value={photoNewEventName}
                      onChange={e => setPhotoNewEventName(e.target.value)}
                      placeholder="e.g. SAGA '26"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Drop Zone */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleStageFiles(e.dataTransfer.files); }}
                    onClick={() => photoDropInputRef.current?.click()}
                    className="group border-2 border-dashed border-white/15 hover:border-brand-500/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/3 hover:bg-brand-500/5 transition-all cursor-pointer min-h-[160px]"
                  >
                    <UploadCloud className="w-10 h-10 text-gray-500 group-hover:text-brand-400 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-300">Drop photos here or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">Select multiple images at once · JPG, PNG, WEBP</p>
                    </div>
                    <input
                      ref={photoDropInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => { if (e.target.files) handleStageFiles(e.target.files); e.target.value = ""; }}
                    />
                  </div>

                  {/* Preview Grid */}
                  {photoStagedFiles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {photoStagedFiles.length} photo{photoStagedFiles.length !== 1 ? "s" : ""} staged
                        </p>
                        <button
                          type="button"
                          onClick={() => setPhotoStagedFiles([])}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                        {photoStagedFiles.map((staged, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/10 aspect-square">
                            <img src={staged.previewUrl} alt={staged.name} loading="lazy" decoding="async" className="w-full h-full object-contain p-1 bg-neutral-950" />
                            {/* File info badge */}
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1 flex items-center justify-between">
                              <span className="text-[10px] text-gray-300 font-semibold truncate max-w-full">{staged.width && staged.height ? `${staged.width} × ${staged.height}` : staged.name}</span>
                            </div>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => setPhotoStagedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end items-center bg-black/40 flex-shrink-0 rounded-b-2xl gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {activeCategory === "photography" ? (
                <button
                  type="button"
                  disabled={saving || photoStagedFiles.length === 0 || !photoNewEventName.trim()}
                  onClick={handleSaveNewPhotoEvent}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {photoUploadProgress ? `${photoUploadProgress.current}/${photoUploadProgress.total} (${Math.round((photoUploadProgress.current / photoUploadProgress.total) * 100)}%)` : "photos..."}
                    </>
                  ) : (
                    <>Save {photoStagedFiles.length > 0 ? `${photoStagedFiles.length} Photo${photoStagedFiles.length !== 1 ? "s" : ""}` : "Photos"}</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Photography Event Sub-Manager Modal */}
      {photoSubManagerEvent !== null && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" data-lenis-prevent>
          <div className="bg-black border border-white/10 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overscroll-contain overflow-hidden" data-lenis-prevent>
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">Manage Event Category Photos</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Event: <span className="text-brand-400 font-semibold">{photoSubManagerEvent}</span>
                </p>
              </div>
              <button
                onClick={() => setPhotoSubManagerEvent(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable grid area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain min-h-0" data-lenis-prevent>
              {/* Photo uploader bar */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm">Add Photos to Category</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSubEventDuplicates && (
                      <button
                        type="button"
                        disabled={cleaningDuplicates}
                        onClick={handleCleanDuplicates}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 text-red-400 rounded-3xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                        title="Remove duplicate photos from DB and Vercel Blob CDN"
                      >
                        {cleaningDuplicates ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        )}
                        Clean Duplicates
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={bulkUploading}
                      onClick={() => {
                        setBulkQueue([]);
                        subFileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-3xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      {bulkUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Bulk Upload
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={subFileInputRef}
                    onChange={handleBulkPhotoUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                </div>

                {/* Bulk progress panel */}
                {bulkQueue.length > 0 && (
                  <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                    {/* Summary header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                      <span className="text-xs font-semibold text-gray-300">
                        {bulkQueue.filter(f => f.status === "done").length} / {bulkQueue.length} uploaded
                      </span>
                      <div className="flex items-center gap-3 text-[10px] font-semibold">
                        <span className="text-yellow-400">{bulkQueue.filter(f => f.status === "queued" || f.status === "uploading").length} pending</span>
                        <span className="text-green-400">{bulkQueue.filter(f => f.status === "done").length} done</span>
                        <span className="text-red-400">{bulkQueue.filter(f => f.status === "error").length} failed</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-white/5 w-full">
                      <div
                        className="h-full bg-brand-500 transition-all duration-300"
                        style={{ width: `${(bulkQueue.filter(f => f.status === "done").length / bulkQueue.length) * 100}%` }}
                      />
                    </div>
                    {/* File list */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                      {bulkQueue.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2">
                          <div className="flex-shrink-0 w-4 h-4">
                            {entry.status === "done" && (
                              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            )}
                            {entry.status === "error" && (
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                            {entry.status === "uploading" && (
                              <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                            )}
                            {entry.status === "queued" && (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-300 truncate flex-1 font-mono">{entry.name}</span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                            entry.status === "done" ? "text-green-400" :
                            entry.status === "error" ? "text-red-400" :
                            entry.status === "uploading" ? "text-brand-400" :
                            "text-gray-500"
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Photos List Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {subEventPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handleSubPhotoDragStart(e, index)}
                    onDragOver={(e) => handleSubPhotoDragOver(e, index)}
                    onDragEnd={handleSubPhotoDragEnd}
                    className={`group relative bg-neutral-900 border ${
                      draggingSubPhotoIdx === index ? "border-brand-500 opacity-50 scale-95" : "border-white/10 hover:border-white/30"
                    } rounded-xl overflow-hidden aspect-square flex flex-col transition-all cursor-grab active:cursor-grabbing shadow-md`}
                  >
                    {/* Full Photo Fit (object-contain) */}
                    <div className="w-full flex-1 min-h-0 bg-neutral-950 p-1.5 flex items-center justify-center relative">
                      <img
                        src={photo.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                      {/* Drag Handle Indicator */}
                      <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Footer bar with photo dimensions & actions - 100% fixed & visible */}
                    <div className="h-9 px-2.5 border-t border-white/10 flex items-center justify-between bg-black/90 backdrop-blur-md flex-shrink-0 z-10">
                      <span className="text-[10px] text-gray-300 font-mono truncate max-w-[50%]">
                        {photo.width && photo.height ? `${photo.width} × ${photo.height}` : "Photo"}
                      </span>
                      <div className="flex items-center gap-1">
                        <a
                          href={photo.src}
                          download
                          target="_blank"
                          rel="noreferrer"
                          title="Download photo"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhotoFromSubEvent(photo.id);
                          }}
                          title="Delete photo"
                          className="p-1.5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {subEventPhotos.length === 0 && (
                  <div className="col-span-full p-12 text-center text-gray-500">
                    No images registered under this event.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/40 flex-shrink-0 rounded-b-2xl">
              <span className="text-xs text-gray-400">
                {hasReorderedSubPhotos ? "Photo order changed." : "Drag and drop photos to reorder."}
              </span>
              <div className="flex items-center gap-3">
                {hasReorderedSubPhotos && (
                  <button
                    type="button"
                    disabled={savingSubPhotoOrder}
                    onClick={handleSaveSubPhotoOrder}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingSubPhotoOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhotoSubManagerEvent(null)}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-3xl font-semibold text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
