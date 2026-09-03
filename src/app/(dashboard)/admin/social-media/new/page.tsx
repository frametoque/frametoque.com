"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Twitter, X, Upload, Check, Loader2, CheckCircle, AlertCircle, Facebook, Instagram, Linkedin, Send, Youtube, Store, AtSign, Clock } from "lucide-react";
import { uploadSocialMedia, createSocialPostRecord, publishToPlatform, finalizeSocialPost, updateSocialPostRecord, updatePlatformPost, getSocialPostById } from "../../actions/social-media";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";




const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.975H5.039z" />
  </svg>
);

function CreateNewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const editId = searchParams.get('edit');
  const repostId = searchParams.get('repost');

  const [platforms, setPlatforms] = useState<string[]>(['facebook', 'instagram', 'threads', 'telegram', 'youtube', 'gmb']);
  const [caption, setCaption] = useState("");
  const [customCaptions, setCustomCaptions] = useState<Record<string, string>>({});
  const [customize, setCustomize] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [loading, setLoading] = useState(!!(editId || repostId));
  const hasImage = mediaUrls.some(url => url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i));
  const hasVideo = mediaUrls.some(url => url.match(/\.(mp4|mov|avi|mkv|webm)$/i));

  useEffect(() => {
    if (hasImage) setPlatforms(prev => prev.filter(p => p !== 'youtube'));
    if (hasVideo) setPlatforms(prev => prev.filter(p => p !== 'gmb'));
  }, [hasImage, hasVideo]);
  const [publishingState, setPublishingState] = useState<{isOpen: boolean; currentPlatform: string;  results: Record<string, { status: 'loading' | 'success' | 'error' | 'warning' | 'scheduled'; error?: string; warning?: string; progress?: number }>; done: boolean; isScheduled?: boolean}>({ isOpen: false, currentPlatform: '', results: {}, done: false });

  useEffect(() => {
    const fetchPost = async (id: string) => {
      const post = await getSocialPostById(parseInt(id));
      if (post) {
        setPlatforms(post.status === 'published' ? Object.keys(post.platform_post_ids || {}) : (post.platforms || []));
        setCaption(post.default_caption || "");
        setCustomCaptions(post.custom_captions || {});
        if (Object.keys(post.custom_captions || {}).length > 0) setCustomize(true);
        setMediaUrls(post.media_urls || []);
        
        // Only set schedule for edit, not repost
        if (editId && post.scheduled_time && post.status === 'scheduled') {
           const d = new Date(post.scheduled_time);
           // format to yyyy-MM-ddThh:mm for datetime-local
           const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
           setSchedule(local);
        }
      }
      setLoading(false);
    };

    if (editId) fetchPost(editId);
    else if (repostId) fetchPost(repostId);
  }, [editId, repostId]);

  
  const togglePlatform = (p: string) => {
    if (p === 'youtube' && hasImage) return alert('YouTube only accepts videos.');
    if (p === 'gmb' && hasVideo) return alert('Google Business API does not support video uploads.');
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const url = await uploadSocialMedia(formData);
        newUrls.push(url);
      }
      
      setMediaUrls(prev => {
        const next = [...prev, ...newUrls];
        if (next.some(url => url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i))) {
          setPlatforms(p => p.filter(x => x !== 'youtube'));
        }
        return next;
      });
    } catch (err) {
      alert("Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (platforms.length === 0) return alert("Select at least one platform");
    
    setSaving(true);
    const schedDate = schedule ? new Date(schedule) : null;
    const isScheduled = schedDate && schedDate > new Date();
    
    setPublishingState({ isOpen: true, currentPlatform: '', results: {}, done: false, isScheduled });
    
    const finalStatus = isScheduled ? 'scheduled' : 'published';

    // 1. Create or Update DB Record first
    let postId = 0;
    if (editId) {
      const res = await updateSocialPostRecord(parseInt(editId), platforms, caption, customCaptions, mediaUrls, schedDate, finalStatus);
      if (!res.success) {
         alert("Failed to update record");
         setPublishingState(prev => ({ ...prev, isOpen: false }));
         setSaving(false);
         return;
      }
      postId = parseInt(editId);
    } else {
      const res = await createSocialPostRecord(platforms, caption, customCaptions, mediaUrls, schedDate, finalStatus);
      if (!res.success) {
         alert("Failed to create record");
         setPublishingState(prev => ({ ...prev, isOpen: false }));
         setSaving(false);
         return;
      }
      postId = res.id;
    }

    // 2. If it's scheduled, we don't need to ping platforms now
    if (isScheduled) {
       const resObj: any = {};
       for (const p of [...platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b))) resObj[p] = { status: 'scheduled' };
       setPublishingState(prev => ({ ...prev, results: resObj, done: true }));
       setTimeout(() => router.push("/admin/social-media"), 1500);
       return;
    }

    // 3. Ping each platform sequentially
    const results: any = {};
    for (const p of [...platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b))) {
      setPublishingState(prev => ({ ...prev, currentPlatform: p, results: { ...prev.results, [p]: { status: 'loading', progress: 0 } } }));
      
      let progressInterval = setInterval(() => {
        setPublishingState(prev => {
          const currentP = prev.results[p];
          if (!currentP || currentP.status !== 'loading') return prev;
          const currentProg = currentP.progress || 0;
          if (currentProg >= 99) return prev;
          const increment = Math.floor(Math.random() * 8) + 2;
          return {
            ...prev,
            results: {
              ...prev.results,
              [p]: { ...currentP, progress: Math.min(99, currentProg + increment) }
            }
          };
        });
      }, 400);
      
      let res;
      if (editId) res = await updatePlatformPost(postId, p);
      else res = await publishToPlatform(postId, p);
      
      clearInterval(progressInterval);
      
      results[p] = { 
        status: res.warning ? 'warning' : (res.success ? 'success' : 'error'), 
        error: res.error,
        warning: res.warning
      };
      setPublishingState(prev => ({ ...prev, results: { ...prev.results, [p]: results[p] } }));
      
      // Small artificial delay so the UI doesn't blur instantly if fast
      await new Promise(r => setTimeout(r, 800));
    }
    
    await finalizeSocialPost(postId, 'published');
    setPublishingState(prev => ({ ...prev, done: true, currentPlatform: '' }));
    
    // Auto redirect after 2 seconds if everything succeeded
    if (Object.values(results).every((r: any) => r.status === 'success')) {
       setTimeout(() => router.push("/admin/social-media"), 2000);
    } else {
       setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 mt-10">Loading post data...</div>;

  return (
    <div className="w-full pb-20 mt-2">
      {publishingState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6">
             <h3 className="text-xl font-bold text-white mb-6">
               {publishingState.done 
                 ? (publishingState.isScheduled ? "Scheduling Complete" : "Publishing Complete") 
                 : (publishingState.isScheduled ? "Scheduling to Platforms..." : "Publishing to Platforms...")}
             </h3>
             <div className="space-y-4">
               {[...platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b)).map(p => {
                 const st = publishingState.results[p];
                 const isCurrent = publishingState.currentPlatform === p;
                 
                 return (
                   <div key={p} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                     st?.status === 'success' ? 'bg-green-500/10 border-green-500/20' : 
                     st?.status === 'scheduled' ? 'bg-brand-500/10 border-brand-500/20' : 
                     st?.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 
                     st?.status === 'error' ? 'bg-red-500/10 border-red-500/20' : 
                     isCurrent ? 'bg-brand-500/10 border-brand-500/20' : 'bg-white/5 border-white/10'
                   }`}>
                     <span className="font-bold capitalize text-white flex items-center gap-3">
                       {p === "gmb" ? "Google Business" : p}
                       {st?.status === 'error' && <span className="text-[10px] text-red-400 font-normal leading-tight">{st.error}</span>}
                       {st?.status === 'warning' && <span className="text-[10px] text-yellow-400 font-normal leading-tight">{st.warning}</span>}
                     </span>
                     <div>
                       {st?.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                       {st?.status === 'scheduled' && <Clock className="w-5 h-5 text-brand-400" />}
                       {st?.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                       {st?.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                       {st?.status === 'loading' && (
                        <div className="flex items-center gap-2 text-brand-400">
                          <span className="text-[10px] font-bold">{st.progress || 0}%</span>
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                       {!st && <div className="w-5 h-5 border-2 border-white/10 rounded-full" />}
                     </div>
                   </div>
                 );
               })}
             </div>
             
             {publishingState.done && (
               <div className="mt-8 flex justify-end">
                 <button onClick={() => router.push("/admin/social-media")} className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                   Go to Dashboard
                 </button>
               </div>
             )}
           </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: Content & Customizations */}
        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-xl space-y-8">
          {/* Media with Small Previews */}
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-3">Media (Photos/Videos)</label>
            <div className="flex gap-4 flex-wrap">
              {mediaUrls.map((url, i) => {
                const isVideo = url.match(/\.(mp4|mov|webm|mkv|avi)$/i);
                return (
                  <div key={i} className="w-40 h-40 rounded-xl overflow-hidden border border-white/10 relative group shadow-sm">
                    {isVideo ? (
                      <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white transition-colors hover:bg-red-500 shadow-lg border border-white/20">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <label className="w-40 h-40 rounded-xl border-2 border-dashed border-white/20 hover:border-brand-500 flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-brand-400 transition-colors bg-white/5">
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                {uploading ? <span className="text-sm font-medium">Loading...</span> : (
                  <>
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Upload</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-3">Caption</label>
            <textarea
              required
              rows={8}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What do you want to say?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-white resize-none"
            />
          </div>

          {/* Custom Captions */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-white">
              <input type="checkbox" checked={customize} onChange={e => setCustomize(e.target.checked)} className="rounded bg-black border-white/20 text-brand-500 w-4 h-4" />
              Customize caption for specific platforms
            </label>
            
            {customize && (
              <div className="mt-6 space-y-4">
                {[...platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b)).map(p => (
                  <div key={p === "gmb" ? "Google Business" : p}>
                    <label className="text-xs font-bold text-gray-400 capitalize mb-2 block">{p === "gmb" ? "Google Business" : p} Caption Override</label>
                    <textarea
                      rows={2}
                      value={customCaptions[p] || ""}
                      onChange={e => setCustomCaptions(prev => ({...prev, [p]: e.target.value}))}
                      placeholder={`Leave blank to use default caption on ${p === "gmb" ? "Google Business" : p}`}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 text-white resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings & Platforms */}
        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-xl space-y-8 lg:sticky lg:top-24">
          
          {/* Platforms */}
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-3">Select Platforms</label>
            <div className="flex flex-col gap-3">
              {[
                { id: 'facebook', name: 'Facebook', icon: Facebook },
                { id: 'instagram', name: 'Instagram', icon: Instagram },
                { id: 'threads', name: 'Threads', icon: AtSign },
                { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
                { id: 'youtube', name: 'YouTube', icon: Youtube },
                { id: 'telegram', name: 'Telegram', icon: Send },
                { id: 'gmb', name: 'Google Business', icon: Store }
              ].map(p => {
                const Icon = p.icon;
                const isDisabled = (p.id === 'youtube' && hasImage) || (p.id === 'gmb' && hasVideo) || p.id === 'linkedin';
                const isSelected = platforms.includes(p.id) && !isDisabled;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected ? "bg-brand-500/10 border-brand-500/30 shadow-[0_0_15px_rgba(var(--brand-500),0.1)]" : "bg-white/5 border-white/10 hover:bg-white/10"
                    } ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-brand-500/20 text-brand-300" : "bg-white/10 text-gray-400"}`}>
                         <Icon className="w-5 h-5" />
                      </div>
                      <span className={`font-bold flex items-center gap-2 ${isSelected ? "text-white" : "text-gray-400"}`}>
                        {p.name}
                        {(p.id === 'linkedin') && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Coming Soon</span>}
                      </span>
                    </div>
                    
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isSelected ? "bg-brand-500" : "bg-gray-700"}`}>
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isSelected ? "translate-x-6" : "translate-x-0"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-sm font-semibold text-gray-400 block mb-3">Schedule (Leave blank to publish now)</label>
            <input
              type="datetime-local"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-500 text-white w-full [color-scheme:dark]"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-4">
            <Link href="/admin/social-media" className="px-6 py-3 rounded-xl font-bold text-white hover:bg-white/10 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : schedule ? (editId ? "Update Scheduled Post" : "Schedule Post") : (editId ? "Publish Edit" : "Publish Now")}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

const PROFILE_LINKS: Record<string, string> = {
  facebook: "https://www.facebook.com/frametoque",
  instagram: "https://www.instagram.com/frame.toque/",
  threads: "https://www.threads.com/@frame.toque",
  gmb: "https://share.google/KP8e3PxZ6cwZ0cuIy",
  linkedin: "https://www.linkedin.com/company/frametoque/",
  telegram: "https://t.me/@Frametoque",
  youtube: "https://www.youtube.com/@Frametoque",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="text-gray-400 mt-10">Loading...</div>}>
      <CreateNewPostForm />
    </Suspense>
  );
}
