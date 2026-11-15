import React, { useState } from "react";
import { Clock, CheckCircle, AlertTriangle, Image as ImageIcon, Trash2, Eye, Edit2, Repeat, Facebook, Instagram, Twitter, Linkedin, Youtube, Send, X, Store, AtSign } from "lucide-react";
import Link from "next/link";




const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.975H5.039z" />
  </svg>
);

export default function SocialViews({ posts, loading, onRefresh, onDelete }: any) {
  const [viewingPost, setViewingPost] = useState<any>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col animate-pulse">
            <div className="w-full aspect-square bg-white/5" />
            <div className="p-3 h-24 flex flex-col justify-between">
              <div className="space-y-2 mt-1">
                <div className="h-3 bg-white/10 rounded-full w-full" />
                <div className="h-3 bg-white/10 rounded-full w-2/3" />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded bg-white/5" />
                  <div className="w-3 h-3 rounded bg-white/5" />
                  <div className="w-3 h-3 rounded bg-white/5" />
                </div>
                <div className="h-2.5 bg-white/5 rounded-full w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (posts.length === 0) return <div className="text-gray-500 text-center py-20">No posts found. Create one to get started!</div>;

  const getStatusIcon = (status: string) => {
    if (status === 'published') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'scheduled') return <Clock className="w-4 h-4 text-brand-400" />;
    if (status === 'failed') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getPlatformIcon = (plat: string) => {
    switch(plat) {
      case 'facebook': return <Facebook className="w-3 h-3" />;
      case 'instagram': return <Instagram className="w-3 h-3" />;
      case 'linkedin': return <Linkedin className="w-3 h-3" />;
      case 'youtube': return <Youtube className="w-3 h-3" />;
      case 'telegram': return <Send className="w-3 h-3" />;
      case 'gmb': return <Store className="w-3 h-3" />;
      case 'threads': return <AtSign className="w-3 h-3" />;
      default: return null;
    }
  };

  const handleDelete = async (id: number) => {
    if(confirm("Are you sure? This will delete the post from your dashboard AND the social platforms.")){ 
      await onDelete(id);
    }
  };

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
        {posts.map((p: any) => (
          <div key={p.id} className="break-inside-avoid mb-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col relative group hover:border-white/20 transition-all">
            <div className="w-full bg-black relative">
              {p.media_urls?.length > 0 ? (
                p.media_urls[0].match(/\.(mp4|mov|webm|mkv|avi)$/i) 
                  ? <video src={p.media_urls[0]} autoPlay muted loop playsInline className="w-full h-auto opacity-80" />
                  : <img src={p.media_urls[0]} alt="Media" className="w-full h-auto opacity-80" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
              )}
              
              {/* Top Right: Status */}
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1">
                {getStatusIcon(p.status)}
              </div>

              {/* Action Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <button onClick={() => setViewingPost(p)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" title="View Post">
                  <Eye className="w-5 h-5" />
                </button>
                <Link href={`/admin/social-media/new?edit=${p.id}`} className="p-2 bg-brand-500/20 hover:bg-brand-500/40 text-brand-300 rounded-full transition-colors" title="Edit Post">
                  <Edit2 className="w-5 h-5" />
                </Link>
                <Link href={`/admin/social-media/new?repost=${p.id}`} className="p-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-full transition-colors" title="Repost">
                  <Repeat className="w-5 h-5" />
                </Link>
                <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-full transition-colors" title="Delete Post">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <p className="text-sm text-gray-300 line-clamp-2">{p.default_caption || "No caption"}</p>
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex gap-1.5 text-gray-400">
                  {(() => {
                    const order = ["facebook","instagram","threads","linkedin","youtube","telegram","gmb"];
                    const plats = p.status === 'published' ? Object.keys(p.platform_post_ids || {}) : (p.platforms || []);
                    return [...plats].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((plat: string) => (
                      <div key={plat} title={plat} className="hover:text-white transition-colors">
                        {getPlatformIcon(plat)}
                      </div>
                    ));
                  })()}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {p.scheduled_time ? new Date(p.scheduled_time).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Immediate'}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Post Details
                <div className="flex gap-1 ml-2">
                  {viewingPost.platforms.map((plat: string) => (
                    <div key={plat} className="bg-white/10 p-1.5 rounded-full text-brand-300" title={plat}>
                      {getPlatformIcon(plat)}
                    </div>
                  ))}
                </div>
              </h3>
              <button onClick={() => setViewingPost(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">

              {viewingPost.media_urls?.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {viewingPost.media_urls.map((url: string, idx: number) => {
                    const isVideo = url.match(/\.(mp4|mov|webm|mkv|avi)$/i);
                    return (
                      <div key={idx} className="rounded-xl overflow-hidden border border-white/10 bg-black">
                        {isVideo 
                          ? <video src={url} autoPlay muted loop playsInline controls className="w-full h-auto" />
                          : <img src={url} alt="Media" className="w-full h-auto" />
                        }
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Caption</h4>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white whitespace-pre-wrap">
                  {viewingPost.default_caption || "No caption provided."}
                </div>
              </div>

              {Object.keys(viewingPost.custom_captions || {}).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Captions</h4>
                  <div className="space-y-3">
                    {Object.entries(viewingPost.custom_captions).map(([plat, cap]: any) => (
                      <div key={plat} className="bg-black/40 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-brand-300 text-xs font-bold capitalize">
                          {getPlatformIcon(plat)} {plat}
                        </div>
                        <div className="text-sm text-white whitespace-pre-wrap">{cap}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}