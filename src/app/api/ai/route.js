import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import * as cheerio from 'cheerio';  // Add this import for HTML parsing

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Website URLs for crawling and linking
const FRAME_TOQUE_URLS = {
  main: 'https://frametoque.online/',
  services: 'https://frametoque.online/services',
  about: 'https://frametoque.online/about',
  contact: 'https://frametoque.online/contact',
  projects: 'https://frametoque.online/projects'  
};

// Function to strip markdown formatting
function stripMarkdown(text) {
  if (!text) return text;
  
  return text
    // Remove bold/italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // ***bold italic***
    .replace(/\*\*(.*?)\*\*/g, '$1')      // **bold**
    .replace(/\*(.*?)\*/g, '$1')          // *italic*
    .replace(/__(.*?)__/g, '$1')          // __bold__
    .replace(/_(.*?)_/g, '$1')            // _italic_
    
    // Remove links but keep URL visible
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')  // [text](url) -> text (url)
    
    // Remove headers
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')
    
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    
    // Remove lists
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    
    // Clean up extra spaces
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

const AGENCY_TRAINING = `
You are "Toque AI Assistant", the official AI representative of Frame Toque.

ABOUT FRAME TOQUE:
- Frame Toque is a creative agency offering Graphic Design, Web Development, and Video Editing
- You talk to business owners, creators, startups, and marketing teams
- Your main goal is to understand the client need and guide them toward a consultation
- Website: ${FRAME_TOQUE_URLS.main}

CORE BEHAVIOR RULES:
1. Talk like a real human, not a script
2. Answer only what the user asked, do not add extra unrelated info
3. Never repeat the same sentence or idea in one response
4. Do not oversell or sound pushy
5. Keep replies short, clear, and natural
6. Focus on outcomes and value, not process or tools
7. Avoid unnecessary links

TECHNICAL LIMIT:
- Do NOT explain code, software, APIs, hosting, servers, or tools
- If a question becomes technical, say:
  "That’s a great technical question. Our team can explain this better during a quick consultation."

LINK RULES (IMPORTANT):
- Do NOT include links in every response
- Include a link ONLY when:
  a) the user asks about portfolio, projects, services, or contact
  b) the link clearly helps the answer
- Use max ONE link per response
- Never place links in every sentence

AVAILABLE LINKS (use only when relevant):
- Main: ${FRAME_TOQUE_URLS.main}
- Portfolio: ${FRAME_TOQUE_URLS.portfolio}
- Projects: ${FRAME_TOQUE_URLS.projects}
- Services: ${FRAME_TOQUE_URLS.services}
- About: ${FRAME_TOQUE_URLS.about}
- Contact: ${FRAME_TOQUE_URLS.contact}

SERVICE SHORT DESCRIPTIONS (use only if needed):
- Graphic Design: Logos, branding, and visuals that make brands stand out
- Web Development: Modern websites focused on growth and conversions
- Video Editing: High-impact videos for marketing and social media

COMMON QUESTION HANDLING:
- Pricing:
  "Pricing depends on your exact needs. We usually give custom quotes after understanding the project."

- Timeline:
  "Timelines depend on scope, but we’ll clearly define it before starting."

- Unsure client:
  "No worries. A quick chat can help us understand what works best for you."

CALL TO ACTION RULE:
- Suggest a consultation only if it feels natural
- Do NOT force it in every reply
- If suggesting a consultation, keep it soft and friendly
- Example:
  "If you want, we can discuss this in a quick consultation."

RESPONSE STYLE:
- 1–3 sentences only
- Simple English
- Friendly, calm, confidence-building, customer-first
- No emojis
- No markdown formatting except links
- Never repeat ideas


FALLBACK & CONFUSION HANDLING RULES:
- If the user is unclear, vague, or unsure:
  - Ask ONE simple clarifying question only
  - Do not guess their requirement
  - Do not suggest multiple services at once

Examples:
- "Can you tell me a bit more about what you’re trying to achieve?"
- "Is this for a business or personal project?"

- If the user changes topic mid-conversation:
  - Answer only the latest question
  - Ignore previous topics unless clearly connected

- If the user repeats the same question:
  - Rephrase the answer differently
  - Do not copy or repeat earlier wording

- If the user says “just checking” or “exploring”:
  - Stay informative
  - Do not push consultation immediately

ANTI-REPETITION RULE:
- Never repeat:
  - the same CTA line
  - the same service description
  - the same sentence structure
- If information was already shared, shorten it next time

GOOD VS BAD RESPONSE EXAMPLES:

BAD:
"Check our portfolio here [Portfolio](link). We offer web development services that help your business grow. Contact us for a free consultation here [Contact](link)."

WHY BAD:
- Link spam
- Forced CTA
- Robotic tone

GOOD:
"We design websites that are clean, fast, and built to convert visitors into customers. If you’d like, we can talk through your idea."

BAD:
"Our services include graphic design, web development, and video editing. View our services here [Services](link)."

GOOD:
"What kind of project are you planning right now? Design, website, or video?"

BAD:
"That’s a great question. That’s a great question. Our team would be happy to discuss this."

GOOD:
"That’s a great technical question. Our team can explain it clearly during a quick chat."

FINAL QUALITY CHECK BEFORE SENDING RESPONSE:
- Does this directly answer the user?
- Is this under 3 sentences?
- Did I avoid repeating myself?
- Did I include a link only if it actually helps?
- Does this sound like a real agency person?


FACT & TRUTH CONTROL (ANTI-HALLUCINATION RULES):
1. ONLY use information explicitly written in this instruction set
2. NEVER assume services, features, prices, offers, tools, guarantees, clients, or workflows
3. If information is NOT clearly defined here, say you don’t have that detail
4. NEVER invent:
   - pricing numbers
   - guarantees or promises
   - client names or brands
   - tools, software, or platforms
   - packages or plans
5. If unsure, choose honesty over guessing

SAFE RESPONSE FOR UNKNOWN INFO:
- Use one of these formats only:
  - "I don’t have that information right now, but our team can clarify."
  - "That detail depends on the project and is handled by our team."
  - "That’s something our team usually discusses directly."

NO ASSUMPTION RULE:
- Do NOT assume:
  - the user’s budget
  - the user’s industry
  - the project scale
  - the platform (website, app, social media)
- Ask ONE short clarifying question instead

SCOPE BOUNDARY RULE:
- Frame Toque ONLY offers:
  - Graphic Design
  - Web Development
  - Video Editing
- If asked about anything outside this scope:
  - Clearly say it’s not offered
  - Redirect politely to consultation if relevant

  FINAL QUALITY CHECK BEFORE SENDING RESPONSE:
- Is every claim backed by this instruction text?
- Did I avoid guessing or filling gaps?
- Did I say "I don’t know" if unsure?
- Is this under 3 sentences?
- Did I avoid repeating myself?
- Did I include a link only if it actually helps?
- Does this sound human and honest?

CUSTOMER-FRIENDLY CONVERSATION RULES:
1. Be warm, approachable, and easy to talk to
2. Make the user feel understood before selling anything
3. Acknowledge their goal or problem in one short line
4. Use natural phrases like:
   - "That makes sense"
   - "Got it"
   - "Sounds like you’re planning something interesting"
5. Never pressure the user, guide them instead

SOFT LEAD-CATCHING LOGIC:
- Your role is to gently move the user toward a real conversation
- Do this by:
  a) showing you understand their need
  b) explaining how Frame Toque can help at a high level
  c) inviting them to continue the discussion

GOOD CTA STYLE (use only one):
- "If you want, we can talk this through properly."
- "A quick chat would help us guide you better."
- "We can explore this together in a short consultation."

DO NOT use aggressive CTAs like:
- "Contact us now"
- "Book immediately"
- "Don’t miss out"

TRUST & CREDIBILITY RULES:
1. Never exaggerate or promise results
2. Speak confidently but realistically
3. Use phrases that build trust:
   - "We usually help clients with…"
   - "This works best when we understand your goals"
   - "Each project is handled differently"
4. Avoid absolute claims like:
   - "Guaranteed"
   - "Best"
   - "Perfect solution"

MICRO-ENGAGEMENT RULE:
- End most replies with ONE light engagement hook:
  - a simple question
  - or a gentle invitation

Examples:
- "What’s the main goal for this project?"
- "Is this for a brand or a personal project?"
- "Do you already have something in place, or starting fresh?"

Rules:
- Ask only ONE question
- Keep it short
- No multiple options unless necessary


`;


// Crawled website data (to be populated)
let websiteContent = {
  services: [],
  portfolio: [],
  pages: {},
  lastCrawled: null
};

const OPENROUTER_MODELS = {
  'meta-llama/llama-3.2-3b-instruct': 'free',
  'microsoft/phi-3.5-mini-instruct': 'free',
  'qwen/qwen-2.5-3b-instruct': 'free',
};

// Function to crawl website
async function crawlWebsite() {
  try {
    console.log('🕷️ Starting website crawl...');
    
    const crawlResults = {
      services: [],
      portfolio: [],
      pages: {},
      lastCrawled: new Date().toISOString()
    };

    // Crawl main pages
    for (const [pageName, url] of Object.entries(FRAME_TOQUE_URLS)) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'FrameToque-AI-Crawler/1.0 (+https://frametoque.online)'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Extract basic information
          const title = $('title').text().trim() || pageName;
          
          // Extract meta description
          const description = $('meta[name="description"]').attr('content')?.trim() || '';
          
          // Extract main content (headings, paragraphs, lists from body)
          const contentElements = $('body h1, body h2, body h3, body p, body li').map((i, el) => $(el).text().trim()).get();
          const content = contentElements.join(' ').replace(/\s+/g, ' ').trim();  // Clean and join text
          
          crawlResults.pages[pageName] = {
            url,
            title,
            description,
            content,  // New: Full extracted text content
            crawled: new Date().toISOString()
          };
          
          console.log(`✅ Crawled: ${pageName} - ${title} (Content length: ${content.length} chars)`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to crawl ${pageName}:`, error.message);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Update website content
    websiteContent = crawlResults;
    console.log('✅ Website crawl completed');
    
    return crawlResults;
  } catch (error) {
    console.error('❌ Crawl error:', error);
    return null;
  }
}

// Function to enhance responses with links
function enhanceResponseWithLinks(response, userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  let enhancedResponse = response;
  
  // Add portfolio link if talking about examples/work
  if (lowerMsg.includes('portfolio') || lowerMsg.includes('example') || 
      lowerMsg.includes('work') || lowerMsg.includes('see') ||
      lowerMsg.includes('show') || lowerMsg.includes('previous')) {
    if (!response.includes(FRAME_TOQUE_URLS.portfolio)) {
      enhancedResponse += `\n\nYou can view our portfolio at [Frame Toque Portfolio](${FRAME_TOQUE_URLS.portfolio}) to see examples of our work.`;
    }
  }
  
  // Add projects link for specific project examples
  if (lowerMsg.includes('project') || lowerMsg.includes('case study') || 
      lowerMsg.includes('example') || lowerMsg.includes('website')) {
    if (!response.includes(FRAME_TOQUE_URLS.projects)) {
      enhancedResponse += `\n\nCheck out our [Projects page](${FRAME_TOQUE_URLS.projects}) for specific case studies.`;
    }
  }
  
  // Add services link if talking about what we do
  if (lowerMsg.includes('service') || lowerMsg.includes('what you do') || 
      lowerMsg.includes('offer') || lowerMsg.includes('provide')) {
    if (!response.includes(FRAME_TOQUE_URLS.services)) {
      enhancedResponse += `\n\nLearn more about our [Services](${FRAME_TOQUE_URLS.services}).`;
    }
  }
  
  // Add contact link if suggesting consultation
  if (response.includes('consultation') || response.includes('contact') || 
      response.includes('schedule') || response.includes('book') ||
      response.includes('discuss')) {
    if (!response.includes(FRAME_TOQUE_URLS.contact)) {
      enhancedResponse += `\n\nContact us to get started: [Book Consultation](${FRAME_TOQUE_URLS.contact})`;
    }
  }
  
  // Add blog link for content/inspiration
  if (lowerMsg.includes('blog') || lowerMsg.includes('article') || 
      lowerMsg.includes('learn') || lowerMsg.includes('inspiration') ||
      lowerMsg.includes('tips')) {
    if (!response.includes(FRAME_TOQUE_URLS.blog)) {
      enhancedResponse += `\n\nCheck out our [Blog](${FRAME_TOQUE_URLS.blog}) for tips and inspiration.`;
    }
  }
  
  // Ensure main website link is mentioned at least once
  if (!response.includes(FRAME_TOQUE_URLS.main) && !enhancedResponse.includes(FRAME_TOQUE_URLS.main)) {
    enhancedResponse += `\n\nVisit our [Website](${FRAME_TOQUE_URLS.main}) for more information.`;
  }
  
  return enhancedResponse.trim();
}

const getClientFocusedResponse = (userMessage) => {
  const lowerMsg = userMessage.toLowerCase();
  
  const technicalTerms = [
    'react', 'next.js', 'javascript', 'typescript', 'code',
    'backend', 'api', 'hosting', 'server', 'database',
    'framework', 'library', 'package', 'npm', 'node',
    'css', 'html', 'frontend', 'fullstack', 'devops'
  ];
  
  const hasTechnical = technicalTerms.some(term => lowerMsg.includes(term));
  
  if (hasTechnical) {
  return `That’s a good technical question. Our team can explain this properly during a quick consultation if you’d like.`;
}

if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
  return `Pricing depends on what you need. We usually share a clear quote after understanding the project.`;
}

if (lowerMsg.includes('time') || lowerMsg.includes('how long') || lowerMsg.includes('deadline')) {
  return `Timelines depend on the project size. Most designs are done faster than full websites, and we confirm timelines before starting.`;
}

if (lowerMsg.includes('see work') || lowerMsg.includes('portfolio') || lowerMsg.includes('example')) {
  return `Sure. You can view some of our recent work here: [Frame Toque Portfolio](${FRAME_TOQUE_URLS.portfolio})`;
}

if (lowerMsg.includes('design') || lowerMsg.includes('graphic')) {
  return `We handle logos, branding, and visual designs that help businesses look professional and consistent.`;
}

if (lowerMsg.includes('website') || lowerMsg.includes('web') || lowerMsg.includes('develop')) {
  return `We build modern websites focused on clarity, performance, and growth.`;
}

if (lowerMsg.includes('video') || lowerMsg.includes('edit')) {
  return `We edit videos for marketing, social media, and brand storytelling.`;
}

if (lowerMsg.includes('about') || lowerMsg.includes('who are you') || lowerMsg.includes('company')) {
  return `Frame Toque is a creative agency working with brands on design, websites, and video content.`;
}

if (lowerMsg.includes('contact') || lowerMsg.includes('email') || lowerMsg.includes('phone')) {
  return `You can reach us through our contact page. We usually reply within a day. [Contact Frame Toque](${FRAME_TOQUE_URLS.contact})`;
}

const defaults = [
  `I can help with that. Could you tell me a bit more about what you’re planning?`,
  `That sounds interesting. What kind of result are you aiming for?`,
  `Happy to help. Share a little more detail so I can guide you better.`
];

  
  return defaults[Math.floor(Math.random() * defaults.length)];
};

export async function POST(req) {
  try {
    const { message, format = 'markdown' } = await req.json(); // Default to 'markdown' instead of 'plain'

    if (!message || typeof message !== 'string' || message.trim() === '') {
      const welcomeMsg = `Hello! I'm the Frame Toque AI Assistant. We specialize in graphic design, web development, and video editing. How can I help you today?\n\nVisit our website: [Frame Toque](${FRAME_TOQUE_URLS.main}) | View portfolio: [Frame Toque Portfolio](${FRAME_TOQUE_URLS.portfolio})`;
      
      return Response.json({ 
        reply: format === 'plain' ? stripMarkdown(welcomeMsg) : welcomeMsg, // Return Markdown by default
        replyRaw: welcomeMsg,
        mode: "welcome",
        links: FRAME_TOQUE_URLS,
        format: format
      });
    }

    console.log(`📩 Client message: "${message}"`);

    // Check if we should crawl (once per hour)
    const shouldCrawl = !websiteContent.lastCrawled || 
      (Date.now() - new Date(websiteContent.lastCrawled).getTime() > 3600000);
    
    if (shouldCrawl) {
      crawlWebsite().catch(console.error);
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.log("⚠️ No OpenRouter API key - using trained fallback");
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const baseResponse = getClientFocusedResponse(message);
      const enhancedResponse = enhanceResponseWithLinks(baseResponse, message);
      
      return Response.json({ 
        reply: format === 'plain' ? stripMarkdown(enhancedResponse) : enhancedResponse, // Return Markdown by default
        replyRaw: enhancedResponse,
        mode: "trained-fallback",
        model: "Frame Toque Training",
        crawled: websiteContent.lastCrawled,
        format: format
      });
    }

    const modelsToTry = [
      'meta-llama/llama-3.2-3b-instruct', 
      'microsoft/phi-3.5-mini-instruct',  
    ];

    let lastError = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        
        // In the generateText prompt, include crawled content for context
        const websiteContext = Object.entries(websiteContent.pages).map(([page, data]) => 
          `${page.toUpperCase()}: ${data.content.substring(0, 500)}...`  // Limit to 500 chars per page to fit token limits
        ).join('\n');
        
        const { text } = await generateText({
          model: openrouter(modelName),
          prompt: `${AGENCY_TRAINING}\n\nCurrent Date: ${new Date().toISOString()}\nLast Crawled: ${websiteContent.lastCrawled || 'Never'}\n\nWebsite Content:\n${websiteContext}\n\nClient Message: "${message}"\n\nRespond as Frame Toque AI Assistant (follow all rules above, reference website content where relevant, include links only if helpful):`,
          maxTokens: 300,
          temperature: 0.7,
        });

        console.log(`✅ Success with model: ${modelName}`);
        
        let cleanReply = text
          .replace(/^(As (Frame Toque AI Assistant|the AI assistant),?|Response:|Here(?:'s| is) (?:my |the )?response:)/i, '')
          .trim();
      
        // Enhance with additional links if needed
        cleanReply = enhanceResponseWithLinks(cleanReply, message);
        
        return Response.json({ 
          reply: format === 'plain' ? stripMarkdown(cleanReply) : cleanReply, // Return Markdown by default
          replyRaw: cleanReply,
          mode: "openrouter",
          model: modelName,
          crawled: websiteContent.lastCrawled,
          success: true,
          format: format
        });
        
      } catch (modelError) {
        lastError = modelError;
        console.log(`❌ Model ${modelName} failed:`, modelError.message);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        continue; 
      }
    }
    
    console.error("❌ All OpenRouter models failed:", lastError?.message);
    throw new Error(`All models failed: ${lastError?.message}`);

  } catch (error) {
    console.error("🔥 API Error:", error.message);
    
    const baseResponse = getClientFocusedResponse(message);
    const enhancedResponse = enhanceResponseWithLinks(baseResponse, message);
    const format = req.body?.format || 'markdown'; // Default to 'markdown'
    
    return Response.json({ 
      reply: format === 'plain' ? stripMarkdown(enhancedResponse) : enhancedResponse, // Return Markdown by default
      replyRaw: enhancedResponse,
      mode: "emergency-fallback",
      crawled: websiteContent.lastCrawled,
      error: error.message,
      format: format
    });
  }
}

export async function GET(req) {
  // Manual crawl trigger via GET request
  const url = new URL(req.url);
  if (url.searchParams.get('crawl') === 'true') {
    const crawlResult = await crawlWebsite();
    return Response.json({
      service: "Frame Toque AI Assistant",
      status: "Active",
      provider: "OpenRouter",
      crawled: true,
      content: crawlResult,
      available_models: Object.keys(OPENROUTER_MODELS).filter(k => OPENROUTER_MODELS[k] === 'free'),
      links: FRAME_TOQUE_URLS,
      note: "Use ?format=html in POST requests for HTML formatted responses"
    });
  }
  
  return Response.json({
    service: "Frame Toque AI Assistant",
    status: "Active",
    provider: "OpenRouter",
    last_crawled: websiteContent.lastCrawled,
    available_models: Object.keys(OPENROUTER_MODELS).filter(k => OPENROUTER_MODELS[k] === 'free'),
    links: FRAME_TOQUE_URLS,
    note: "Add ?crawl=true to manually trigger website crawl. Use format='markdown' in POST for Markdown responses (default), or 'plain' for stripped text."
  });
}