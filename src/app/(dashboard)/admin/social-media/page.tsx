"use client";

import React, { useState, useEffect } from "react";
import useSWR from 'swr';
import { getSocialPosts, deletePlatformPost, finalizeDelete, getSocialPostById } from "../actions/social-media";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import SocialViews from "./components/SocialViews";

const PROFILE_LINKS: Record<string, string> = {
  facebook: "https://www.facebook.com/frametoque",
  instagram: "https://www.instagram.com/frame.toque/",
  threads: "https://www.threads.com/@frame.toque",
  gmb: "https://share.google/KP8e3PxZ6cwZ0cuIy",
  linkedin: "https://www.linkedin.com/company/frametoque/",
  telegram: "https://t.me/@Frametoque",
  youtube: "https://www.youtube.com/@Frametoque",
};

export default function SocialMediaPage() {
  const fetcher = async () => {
    const fetchedPosts = await getSocialPosts();
    return { posts: fetchedPosts };
  };

  const { data: swrData, isLoading: loading, mutate: reloadPosts } = useSWR(['social-media-posts'], fetcher);
  const { posts = [] } = swrData || {};

  const deleteStateDefault = { isOpen: false, currentPlatform: '', platforms: [], results: {}, done: false };
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    currentPlatform: string;
    platforms: string[];
    results: Record<string, { status: 'loading' | 'success' | 'error' | 'warning', error?: string; warning?: string }>;
    done: boolean;
  }>(deleteStateDefault);

  const handleDelete = async (id: number) => {
    const post = await getSocialPostById(id);
    if (!post) return;
    const platforms = post.status === 'published' ? Object.keys(post.platform_post_ids || {}) : (post.platforms || []);
    
    setDeleteState({ isOpen: true, currentPlatform: '', platforms, results: {}, done: false });
    
    const results: any = {};
    for (const p of [...platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b))) {
      setDeleteState(prev => ({ ...prev, currentPlatform: p, results: { ...prev.results, [p]: { status: 'loading' } } }));
      
      const res = await deletePlatformPost(id, p);
      results[p] = { 
        status: res.warning ? 'warning' : (res.success ? 'success' : 'error'), 
        error: res.error,
        warning: res.warning 
      };
      setDeleteState(prev => ({ ...prev, results: { ...prev.results, [p]: results[p] } }));
      
      await new Promise(r => setTimeout(r, 800));
    }
    
    await finalizeDelete(id);
    setDeleteState(prev => ({ ...prev, done: true, currentPlatform: '' }));
    
    if (Object.values(results).every((r: any) => r.status === 'success')) {
       setTimeout(() => {
         setDeleteState(prev => ({ ...prev, isOpen: false }));
         reloadPosts();
       }, 2000);
    }
  };

  const loadData = async () => {
    await reloadPosts();
  };

  return (
    <div className="space-y-10 pb-10 mt-2">
      {deleteState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
             <div className="p-6 pb-4 border-b border-white/10 shrink-0">
               <h3 className="text-xl font-bold text-white">
                 {deleteState.done ? "Deletion Complete" : "Deleting from Platforms..."}
               </h3>
             </div>
             <div className="p-6 space-y-4 flex-1 overflow-y-auto">
               {[...deleteState.platforms].sort((a, b) => ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(a) - ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"].indexOf(b)).map((p: string) => {
                 const st = deleteState.results[p];
                 const isCurrent = deleteState.currentPlatform === p;
                 
                 return (
                   <div key={p} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                     st?.status === 'success' ? 'bg-green-500/10 border-green-500/20' : 
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
                       {st?.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                       {st?.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                       {st?.status === 'loading' && <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
                       {!st && <div className="w-5 h-5 border-2 border-white/10 rounded-full" />}
                     </div>
                   </div>
                 );
               })}
             </div>
             
             {deleteState.done && (
               <div className="p-6 pt-4 border-t border-white/10 shrink-0 bg-[#0c0c0e] flex justify-end">
                 <button onClick={() => { setDeleteState(prev => ({ ...prev, isOpen: false })); loadData(); }} className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
                   Close
                 </button>
               </div>
             )}
           </div>
        </div>
      )}
      <div>
        
        <SocialViews  posts={posts} loading={loading} onRefresh={loadData} onDelete={handleDelete} />
      </div>
    </div>
  );
}
