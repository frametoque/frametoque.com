import { notFound } from 'next/navigation';
import ServiceDataPage from "@/components/services/ServiceDetails";

const servicesData = {
    // Web Development
    'portfolio-websites': {
        title: 'Personal Portfolio Website',
        description: 'Clean digital identity for creators and professionals.',
        image: '/services/eventpulse.png',
        keywords: ['portfolio website design Sri Lanka', 'personal website developer Colombo', 'professional portfolio website']
    },
    'business-websites': {
        title: 'Startup / Company Website',
        description: 'Sleek online presence for businesses.',
        image: '/services/eventpulse.png',
        keywords: ['company website design Sri Lanka', 'startup website development', 'business website Colombo Sri Lanka']
    },
    'ecommerce-websites': {
        title: 'E-Commerce Online Store',
        description: 'Stylish platform to sell your products.',
        image: '/services/eventpulse.png',
        keywords: ['ecommerce website development Sri Lanka', 'online store design', 'sell online Sri Lanka']
    },
    'learning-platforms': {
        title: 'E-Learning Platform',
        description: 'Modern LMS for academics and tutors.',
        image: '/services/eventpulse.png',
        keywords: ['e-learning platform development Sri Lanka', 'LMS website design', 'online tutoring platform']
    },
    'media-websites': {
        title: 'Blog / News & Media Website',
        description: 'Ideal for journalists, bloggers, and local news.',
        image: '/services/eventpulse.png',
        keywords: ['blog website design Sri Lanka', 'news website development', 'media website Sri Lanka']
    },
    'booking-systems': {
        title: 'Booking / Ticketing System',
        description: 'Reservation systems for salons, events, and rentals.',
        image: '/services/eventpulse.png',
        keywords: ['booking system development Sri Lanka', 'reservation website', 'ticketing system design']
    },
    'education-websites': {
        title: 'School / Institute Website',
        description: 'Digital presence for schools and tuition centers.',
        image: '/services/eventpulse.png',
        keywords: ['school website design Sri Lanka', 'tuition center website', 'institute website development']
    },

    // Graphic Design
    'logo-design': {
        title: 'Branding & Identity Design',
        description: 'Crafting logos and visuals that define your brand.',
        image: '/services/eventpulse.png',
        keywords: ['logo design Sri Lanka', 'brand identity design Colombo', 'branding agency Sri Lanka']
    },
    'socialmedia-post-design': {
        title: 'Social Media Design',
        description: 'Eye-catching posts and banners for all platforms.',
        image: '/services/eventpulse.png',
        keywords: ['social media design Sri Lanka', 'Instagram post design', 'Facebook banner design']
    },
    'promotional-design': {
        title: 'Marketing & Promotional',
        description: 'Designs that boost your campaigns and sales.',
        image: '/services/eventpulse.png',
        keywords: ['marketing design Sri Lanka', 'promotional material design', 'advertising graphics']
    },
    'stationery-design': {
        title: 'Print & Stationery Design',
        description: 'Stylish business cards, flyers, and letterheads.',
        image: '/services/eventpulse.png',
        keywords: ['business card design Sri Lanka', 'flyer design Colombo', 'print design services']
    },
    'webgraphic': {
        title: 'Digital & Web Graphics',
        description: 'Graphics that make your website and apps pop.',
        image: '/services/eventpulse.png',
        keywords: ['web graphics design Sri Lanka', 'UI graphics', 'website banner design']
    },

    // Video Editing
    'short-form-video-editing': {
        title: 'Short-Form Video Editing',
        description: 'Attention-grabbing vertical videos for Reels, Shorts & TikTok.',
        image: '/services/eventpulse.png',
        keywords: ['short form video editing Sri Lanka', 'Reels editor', 'TikTok video editing service']
    },
    'long-form-video-editing': {
        title: 'Long-Form Video Editing',
        description: 'Polished edits for YouTube, podcasts & long-form content.',
        image: '/services/eventpulse.png',
        keywords: ['YouTube video editing Sri Lanka', 'podcast video editor', 'long form content editing']
    },
    'social-media-video-editing': {
        title: 'Social Media Video Editing',
        description: 'Eye-catching promo & ad videos for all platforms.',
        image: '/services/eventpulse.png',
        keywords: ['social media video editing Sri Lanka', 'promo video editor', 'ad video editing']
    },
    'motion-graphic-and-annimation': {
        title: 'Motion Graphics & Animation',
        description: 'Simple yet powerful motion graphic to boost brand presence.',
        image: '/services/eventpulse.png',
        keywords: ['motion graphics Sri Lanka', 'animation video service', 'animated logo Sri Lanka']
    },
    'corporate-and-business-videos': {
        title: 'Corporate & Business Videos',
        description: 'Expert video edits for brands & businesses.',
        image: '/services/eventpulse.png',
        keywords: ['corporate video editing Sri Lanka', 'business video production', 'brand video editor']
    },
    'content-creator-video-editing': {
        title: 'Content Creator Editing',
        description: 'Energetic edits made for streamers, YouTubers, and online creators.',
        image: '/services/eventpulse.png',
        keywords: ['content creator video editing Sri Lanka', 'YouTube editor for hire', 'streamer video editing']
    },

    // Photography & Videography
    'basic-photography': {
        title: 'Basic Photography Package',
        description: 'Professional photo coverage for small events, birthdays, and personal shoots.',
        image: '/services/eventpulse.png',
        keywords: ['event photography Sri Lanka', 'birthday photography Colombo', 'affordable photo shoot']
    },
    'basic-videography': {
        title: 'Basic Videography Package',
        description: 'Cinematic highlight video coverage for small events and functions.',
        image: '/services/eventpulse.png',
        keywords: ['event videography Sri Lanka', 'highlight video Colombo', 'cinematic event coverage']
    },
    'standard-photo-video': {
        title: 'Standard Photo + Video Package',
        description: 'Complete photography and videography coverage for events and engagements.',
        image: '/services/eventpulse.png',
        keywords: ['photography and videography package Sri Lanka', 'engagement shoot Colombo', 'event photo video']
    },
    'extended-event-package': {
        title: 'Extended Event Package',
        description: 'Extended coverage with cinematic edits and social media reels.',
        image: '/services/eventpulse.png',
        keywords: ['extended event coverage Sri Lanka', 'social media reel videography', 'event filming Colombo']
    },
    'premium-cinematic-package': {
        title: 'Premium Cinematic Package',
        description: 'Luxury full-day coverage with drone and cinematic film production.',
        image: '/services/eventpulse.png',
        keywords: ['drone videography Sri Lanka', 'cinematic wedding film Colombo', 'premium photography package']
    },
    'ultimate-production-package': {
        title: 'Ultimate Production Package',
        description: 'High-end multi-crew production for weddings, brands, and large events.',
        image: '/services/eventpulse.png',
        keywords: ['wedding videography Sri Lanka', 'brand video production', 'multi-crew filming Sri Lanka']
    },
};

export async function generateMetadata({ params }) {
    const { details_slug } = await params;
    const service = servicesData[details_slug];

    if (!service) {
        return {
            title: 'Service Not Found | Frametoque',
            description: 'The requested service page could not be found.'
        };
    }

    return {
        title: `${service.title} | Frametoque`,
        description: service.description,
        keywords: service.keywords,
        openGraph: {
            title: `${service.title} | Frametoque`,
            description: service.description,
            url: `https://frametoque.online/services/${details_slug}`,
            siteName: 'Frametoque',
            images: [
                {
                    url: `https://frametoque.online${service.image}`,
                    width: 1200,
                    height: 630,
                    alt: service.title,
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${service.title} | Frametoque`,
            description: service.description,
            images: [`https://frametoque.online${service.image}`],
        },
    };
}

export default async function ServicePage({ params }) {
    const { details_slug } = await params;
    const service = servicesData[details_slug];

    if (!service) {
        notFound();
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.title,
        description: service.description,
        url: `https://frametoque.online/services/${details_slug}`,
        image: `https://frametoque.online${service.image}`,
        provider: {
            '@type': 'LocalBusiness',
            name: 'Frametoque',
            url: 'https://frametoque.online',
            address: {
                '@type': 'PostalAddress',
                addressLocality: 'Colombo',
                addressCountry: 'LK',
            },
        },
        areaServed: {
            '@type': 'Country',
            name: 'Sri Lanka',
        },
        serviceType: service.title,
        keywords: service.keywords.join(', '),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ServiceDataPage serviceType={details_slug} />
        </>
    );
}