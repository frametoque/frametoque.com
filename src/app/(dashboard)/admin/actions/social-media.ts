"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { putBlob, fetchWithFallback } from "@/lib/storage";
import { google } from "googleapis";
import { Readable } from "stream";

export async function processDueScheduledPosts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const duePosts = await sql`
      SELECT * FROM social_posts 
      WHERE (status = 'scheduled' OR status = 'failed') 
      AND scheduled_time <= NOW()
      LIMIT 5
    `;

    if (duePosts.length === 0) return { success: true, processed: 0 };

    let processedCount = 0;
    for (const post of duePosts) {
      try {
        await sql`UPDATE social_posts SET status = 'processing' WHERE id = ${post.id}`;
        let anySuccess = false;
        for (const platform of post.platforms || []) {
           const publishPromise = publishToPlatform(post.id, platform);
           const timeoutPromise = new Promise<{success: boolean, error: string}>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
           try {
               const res = await Promise.race([publishPromise, timeoutPromise]);
               if (res.success) anySuccess = true;
           } catch (e: any) {}
           await new Promise(r => setTimeout(r, 1000));
        }
        const finalStatus = anySuccess ? 'published' : 'failed';
        await sql`UPDATE social_posts SET status = ${finalStatus} WHERE id = ${post.id}`;
        if (anySuccess) await logSystemAction("publish_social_post");
        processedCount++;
      } catch (err: any) {
        await sql`UPDATE social_posts SET status = 'failed' WHERE id = ${post.id}`;
      }
    }
    return { success: true, processed: processedCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface SocialPost {
  id: number;
  platforms: string[];
  default_caption: string;
  custom_captions: Record<string, string>;
  media_urls: string[];
  scheduled_time: Date | null;
  status: string;
  platform_post_ids: Record<string, string>;
  created_at: Date;
}



export async function uploadSocialMedia(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const blob = await putBlob(`social/${Date.now()}-${safeName}`, file, { access: 'public' });
  return blob.url;
}

export async function getSocialPosts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const result = await sql`SELECT * FROM social_posts ORDER BY created_at DESC`;
    return result.map(post => {
      const parsed = { ...post };
      if (typeof parsed.platforms === 'string') parsed.platforms = JSON.parse(parsed.platforms);
      if (typeof parsed.custom_captions === 'string') parsed.custom_captions = JSON.parse(parsed.custom_captions);
      if (typeof parsed.media_urls === 'string') parsed.media_urls = JSON.parse(parsed.media_urls);
      if (typeof parsed.platform_post_ids === 'string') parsed.platform_post_ids = JSON.parse(parsed.platform_post_ids);
      return parsed;
    });
  } catch(e) { return []; }
}

export async function getSocialPostById(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const result = await sql`SELECT * FROM social_posts WHERE id = ${id}`;
    if (result.length === 0) return null;
    const parsed = { ...result[0] };
    if (typeof parsed.platforms === 'string') parsed.platforms = JSON.parse(parsed.platforms);
    if (typeof parsed.custom_captions === 'string') parsed.custom_captions = JSON.parse(parsed.custom_captions);
    if (typeof parsed.media_urls === 'string') parsed.media_urls = JSON.parse(parsed.media_urls);
    if (typeof parsed.platform_post_ids === 'string') parsed.platform_post_ids = JSON.parse(parsed.platform_post_ids);
    return parsed;
  } catch(e) { return null; }
}

export async function createSocialPostRecord(platforms: string[], default_caption: string, custom_captions: any, media_urls: string[], scheduled_time: Date | null, status: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const res = await sql`
      INSERT INTO social_posts (platforms, default_caption, custom_captions, media_urls, scheduled_time, status)
      VALUES (${JSON.stringify(platforms)}, ${default_caption}, ${JSON.stringify(custom_captions)}, ${JSON.stringify(media_urls)}, ${scheduled_time ? scheduled_time.toISOString() : null}, ${status})
      RETURNING id
    `;
    return { success: true, id: res[0].id };
  } catch(e:any) { return { success: false, error: e.message }; }
}

export async function updateSocialPostRecord(id: number, platforms: string[], default_caption: string, custom_captions: any, media_urls: string[], scheduled_time: Date | null, status: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await sql`
      UPDATE social_posts SET platforms = ${JSON.stringify(platforms)}, default_caption = ${default_caption}, custom_captions = ${JSON.stringify(custom_captions)}, media_urls = ${JSON.stringify(media_urls)}, scheduled_time = ${scheduled_time ? scheduled_time.toISOString() : null}, status = ${status}
      WHERE id = ${id}
    `;
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch(e:any) { return { success: false, error: e.message }; }
}

export async function publishToPlatform(postId: number, platform: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const res = await sql`SELECT * FROM social_posts WHERE id = ${postId}`;
    if (res.length === 0) return { success: false, error: "Not found" };
    const post = res[0];
    let platformPostIds = post.platform_post_ids || {};
    if (typeof platformPostIds === 'string') platformPostIds = JSON.parse(platformPostIds);
    let customCaptions = post.custom_captions || {};
    if (typeof customCaptions === 'string') customCaptions = JSON.parse(customCaptions);
    
    const caption = customCaptions?.[platform] || post.default_caption || "";
    let media_urls = post.media_urls || [];
    if (typeof media_urls === 'string') media_urls = JSON.parse(media_urls);
    
    if (platform === 'gmb') {
        const ayrshareKey = process.env.AYRSHARE_API_KEY;
        if (!ayrshareKey) return { success: false, error: "Missing Ayrshare API Key" };
        
        if (media_urls.length > 0 && media_urls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
            return { success: true, warning: "API does not support video uploading, please manually go and upload it." };
        }
        
        let payload: any = { post: caption, platforms: ["gmb"] };
        if (media_urls.length > 0) payload.mediaUrls = [media_urls[0]];
        const ayrRes = await fetch("https://app.ayrshare.com/api/post", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ayrshareKey}` }, body: JSON.stringify(payload) });
        const data = await ayrRes.json();
        if (data.status === "error") return { success: false, error: data.message };
        if (data.id) platformPostIds['gmb'] = data.id;
    }
    
    if (platform === 'facebook') {
        const accessToken = process.env.META_ACCESS_TOKEN;
        const pageId = process.env.FACEBOOK_PAGE_ID;
        if (!accessToken || !pageId) return { success: false, error: "Missing FB credentials" };
        const isVideo = media_urls.length > 0 && media_urls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const end = media_urls.length > 0 ? (isVideo ? `${pageId}/videos` : `${pageId}/photos`) : `${pageId}/feed`;
        const body: any = { access_token: accessToken };
        if (isVideo) {
            body.file_url = media_urls[0];
            body.description = caption;
        } else if (media_urls.length > 0) {
            body.url = media_urls[0];
            body.message = caption;
        } else {
            body.message = caption;
        }
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/${end}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const fbData = await fbRes.json();
        if (fbData.error) return { success: false, error: fbData.error.message };
        if (fbData.id) platformPostIds['facebook'] = fbData.id;
    }
    
    if (platform === 'instagram') {
        const accessToken = process.env.META_ACCESS_TOKEN;
        const igId = process.env.INSTAGRAM_ACCOUNT_ID;
        if (!accessToken || !igId) return { success: false, error: "Missing IG credentials" };
        if (media_urls.length === 0) return { success: false, error: "Media required" };
        const isVideo = media_urls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const body: any = { caption, access_token: accessToken };
        if (isVideo) {
            body.media_type = 'REELS';
            body.video_url = media_urls[0];
        } else {
            body.image_url = media_urls[0];
        }
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const igData = await igRes.json();
        if (igData.error) return { success: false, error: igData.error.message };

        if (isVideo) {
            let status = 'IN_PROGRESS';
            let attempts = 0;
            while (status !== 'FINISHED' && attempts < 30) {
                await new Promise(r => setTimeout(r, 4000));
                attempts++;
                const statusRes = await fetch(`https://graph.facebook.com/v19.0/${igData.id}?fields=status_code&access_token=${accessToken}`);
                const statusData = await statusRes.json();
                if (statusData.error) {
                    console.error("IG Poll Error:", statusData.error);
                    continue; // Do not break immediately on transient errors like rate limits
                }
                status = statusData.status_code;
                if (status === 'ERROR') return { success: false, error: "Instagram video processing failed" };
            }
        }

        const igPubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: igData.id, access_token: accessToken }) });
        const igPubData = await igPubRes.json();
        if (igPubData.error) return { success: false, error: igPubData.error.message };
        if (igPubData.id) platformPostIds['instagram'] = igPubData.id;
    }

    if (platform === 'telegram') {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!botToken || !chatId) return { success: false, error: "Missing TG credentials" };
        const isVideo = media_urls.length > 0 && media_urls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const endpoint = media_urls.length === 0 ? 'sendMessage' : (isVideo ? 'sendVideo' : 'sendPhoto');
        
        let tgRes;
        if (media_urls.length === 0) {
            tgRes = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: caption }) });
        } else {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            if (caption) formData.append('caption', caption);
            const fileRes = await fetchWithFallback(media_urls[0]);
            const fileBlob = await fileRes.blob();
            formData.append(isVideo ? 'video' : 'photo', fileBlob, 'file' + (isVideo ? '.mp4' : '.jpg'));
            tgRes = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, { method: 'POST', body: formData });
        }
        
        const tgData = await tgRes.json();
        if (!tgData.ok) return { success: false, error: tgData.description };
        if (tgData.result?.message_id) platformPostIds['telegram'] = tgData.result.message_id.toString();
    }
    
    if (platform === 'threads') {
        const accessToken = process.env.THREADS_ACCESS_TOKEN;
        const threadsUserId = process.env.THREADS_USER_ID;
        if (!accessToken || !threadsUserId) return { success: false, error: "Missing Threads credentials" };
        
        let mediaType = "TEXT";
        const body: any = { text: caption, access_token: accessToken };
        
        if (media_urls.length > 0) {
            const isVideo = media_urls[0].match(/\.(mp4|mov|avi|mkv|webm)$/i);
            mediaType = isVideo ? "VIDEO" : "IMAGE";
            body.media_type = mediaType;
            if (isVideo) body.video_url = media_urls[0];
            else body.image_url = media_urls[0];
        } else {
            body.media_type = mediaType;
        }
        
        const cRes = await fetch(`https://graph.threads.net/v1.0/${threadsUserId}/threads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const cData = await cRes.json();
        if (cData.error) return { success: false, error: cData.error.message };

        if (mediaType === "VIDEO") {
            let status = 'IN_PROGRESS';
            let attempts = 0;
            while (status !== 'FINISHED' && attempts < 30) {
                await new Promise(r => setTimeout(r, 4000));
                attempts++;
                const statusRes = await fetch(`https://graph.threads.net/v1.0/${cData.id}?fields=status,error_message&access_token=${accessToken}`);
                const statusData = await statusRes.json();
                if (statusData.error) {
                    console.error("Threads Poll Error:", statusData.error);
                    continue; // Do not break on transient errors
                }
                status = statusData.status;
                if (status === 'ERROR') return { success: false, error: statusData.error_message || "Threads video processing failed" };
            }
        }
        
        const pRes = await fetch(`https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: cData.id, access_token: accessToken }) });
        const pData = await pRes.json();
        if (pData.error) return { success: false, error: pData.error.message };
        if (pData.id) platformPostIds['threads'] = pData.id;
    }

    if (platform === 'linkedin') {
        const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
        const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
        if (!accessToken || !orgId) return { success: false, error: "Missing LI credentials" };
        const author = `urn:li:organization:${orgId}`;
        let specificContent: any = { "com.linkedin.ugc.ShareContent": { "shareCommentary": { "text": caption }, "shareMediaCategory": "NONE" } };
        if (media_urls.length > 0) { specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "ARTICLE"; specificContent["com.linkedin.ugc.ShareContent"].media = [{ status: "READY", originalUrl: media_urls[0] }]; }
        const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' }, body: JSON.stringify({ author, lifecycleState: "PUBLISHED", specificContent, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }) });
        const liData = await liRes.json();
        if (liData.message) return { success: false, error: liData.message };
        if (liData.id) platformPostIds['linkedin'] = liData.id;
    }
    
    if (platform === 'youtube') {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
        if (!clientId || !clientSecret || !refreshToken) return { success: false, error: "Missing YouTube credentials" };
        if (media_urls.length === 0) return { success: false, error: "YouTube requires a video." };
        
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        
        const response = await fetchWithFallback(media_urls[0], { cache: 'no-store' });
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const readableStream = Readable.from(buffer);

        const ytRes = await youtube.videos.insert({
          part: ['snippet', 'status'],
          requestBody: { snippet: { title: caption.substring(0, 95), description: caption }, status: { privacyStatus: 'public' } },
          media: { body: readableStream }
        });
        if (ytRes.data.id) platformPostIds['youtube'] = ytRes.data.id;
    }

    await sql`UPDATE social_posts SET platform_post_ids = ${JSON.stringify(platformPostIds)} WHERE id = ${postId}`;
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch(e:any) { return { success: false, error: e.message }; }
}

export async function updatePlatformPost(postId: number, platform: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const res = await sql`SELECT * FROM social_posts WHERE id = ${postId}`;
    if (res.length === 0) return { success: false, error: "Not found" };
    const post = res[0];
    let platformPostIds = post.platform_post_ids || {};
    if (typeof platformPostIds === 'string') platformPostIds = JSON.parse(platformPostIds);
    let customCaptions = post.custom_captions || {};
    if (typeof customCaptions === 'string') customCaptions = JSON.parse(customCaptions);
    
    const caption = customCaptions?.[platform] || post.default_caption || "";
    let media_urls = post.media_urls || [];
    if (typeof media_urls === 'string') media_urls = JSON.parse(media_urls);
    
    if (platform === 'gmb' && platformPostIds['gmb']) {
        const ayrshareKey = process.env.AYRSHARE_API_KEY;
        await fetch("https://app.ayrshare.com/api/post", { method: "DELETE", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ayrshareKey}` }, body: JSON.stringify({ id: platformPostIds['gmb'] }) });
        return await publishToPlatform(postId, platform);
    }
    
    if (platform === 'facebook' && platformPostIds['facebook']) {
        const accessToken = process.env.META_ACCESS_TOKEN;
        await fetch(`https://graph.facebook.com/v19.0/${platformPostIds['facebook']}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: caption, access_token: accessToken }) });
    }
    
    if (platform === 'instagram' && platformPostIds['instagram']) {
        const accessToken = process.env.META_ACCESS_TOKEN;
        const delRes = await fetch(`https://graph.facebook.com/v19.0/${platformPostIds['instagram']}?access_token=${accessToken}`, { method: 'DELETE' });
        const delData = await delRes.json();
        
        const pubRes = await publishToPlatform(postId, platform);
        
        if (delData.error) {
            if (!pubRes.success) return pubRes; // If publish failed, just show the error.
            if (delData.error.message.includes("permission") || delData.error.code === 200) {
                 return { success: pubRes.success, error: pubRes.error, warning: "New post published with edits. Please manually delete your previous post because Meta API delete is not supported without App Review." };
            }
            return { success: pubRes.success, error: pubRes.error, warning: "New post published. Failed to delete old post: " + delData.error.message };
        }
        
        return pubRes;
    }
    


    if (platform === 'threads' && platformPostIds['threads']) {
        const accessToken = process.env.THREADS_ACCESS_TOKEN;
        const delRes = await fetch(`https://graph.threads.net/v1.0/${platformPostIds['threads']}?access_token=${accessToken}`, { method: 'DELETE' });
        const delData = await delRes.json();
        
        // ALWAYS publish the new post, regardless of if the delete succeeded
        const pubRes = await publishToPlatform(postId, platform);
        
        if (delData.error) {
            // If they haven't passed App Review yet, show the warning requested by the user
            if (delData.error.message.includes("permission") || delData.error.code === 200) {
                 return { success: true, warning: "New post published with edits. Please manually delete your previous post because Meta API delete is not supported without App Review." };
            }
            return { success: true, warning: "New post published. Failed to delete old post: " + delData.error.message };
        }
        
        return pubRes;
    }

    if (platform === 'telegram' && platformPostIds['telegram']) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const endpoint = media_urls.length > 0 ? 'editMessageCaption' : 'editMessageText';
        const payload: any = { chat_id: chatId, message_id: platformPostIds['telegram'] };
        if (media_urls.length > 0) payload.caption = caption; else payload.text = caption;
        await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch(e:any) { return { success: false, error: e.message }; }
}

export async function deletePlatformPost(postId: number, platform: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const res = await sql`SELECT * FROM social_posts WHERE id = ${postId}`;
    if (res.length === 0) return { success: false, error: "Not found" };
    const post = res[0];
    let ids = post.platform_post_ids || {};
    if (typeof ids === 'string') ids = JSON.parse(ids);
    
    if (platform === 'gmb' && ids['gmb']) {
        const ayrshareKey = process.env.AYRSHARE_API_KEY;
        await fetch("https://app.ayrshare.com/api/post", { method: "DELETE", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ayrshareKey}` }, body: JSON.stringify({ id: ids['gmb'] }) });
    }
    
    if (platform === 'facebook' && ids['facebook']) {
        const accessToken = process.env.META_ACCESS_TOKEN;
        await fetch(`https://graph.facebook.com/v19.0/${ids['facebook']}?access_token=${accessToken}`, { method: 'DELETE' });
    }
    
    if (platform === 'instagram' && ids['instagram']) {
        const accessToken = process.env.META_ACCESS_TOKEN;
        await fetch(`https://graph.facebook.com/v19.0/${ids['instagram']}?access_token=${accessToken}`, { method: 'DELETE' });
    }
    


    if (platform === 'threads' && ids['threads']) {
        const accessToken = process.env.THREADS_ACCESS_TOKEN;
        const delRes = await fetch(`https://graph.threads.net/v1.0/${ids['threads']}?access_token=${accessToken}`, { method: 'DELETE' });
        const delData = await delRes.json();
        
        if (delData.error) {
            if (delData.error.message.includes("permission") || delData.error.code === 200) {
                 return { success: true, warning: "Post removed from database. Please manually delete your post on Threads because Meta API delete is not supported without App Review." };
            }
            return { success: false, error: "Failed to delete Threads post: " + delData.error.message };
        }
    }

    if (platform === 'telegram' && ids['telegram']) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: ids['telegram'] }) });
    }
    
    if (platform === 'youtube' && ids['youtube']) {
        const oauth2Client = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        await youtube.videos.delete({ id: ids['youtube'] });
    }

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch(e:any) { return { success: false, error: e.message }; }
}

export async function finalizeSocialPost(postId: number, status: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await sql`UPDATE social_posts SET status = ${status} WHERE id = ${postId}`;
  revalidatePath("/admin", "layout");
    return { success: true };
}

export async function finalizeDelete(postId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await sql`DELETE FROM social_posts WHERE id = ${postId}`;
  revalidatePath("/admin", "layout");
    return { success: true };
}
