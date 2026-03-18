import { notFound } from 'next/navigation';
import ServiceDataPage from "@/components/services/ServiceDetails";

const servicesData = {
    'portfolio-websites': {
        title: 'Personal Portfolio Website',
        description: 'Clean digital identity for creators and professionals.',
        image: '/services/eventpulse.png'
    },

    'business-websites': {
        title: 'Startup / Company Website',
        description: 'Sleek online presence for businesses.',
        image: '/services/eventpulse.png'
    },

    'ecommerce-websites': {
        title: 'E-Commerce Online Store',
        description: 'Stylish platform to sell your products.',
        image: '/services/eventpulse.png'
    },

    'learning-platforms': {
        title: 'E-Learning Platform',
        description: 'Modern LMS for academics and tutors.',
        image: '/services/eventpulse.png'
    },

    'media-websites': {
        title: 'Blog / News & Media Website',
        description: 'Ideal for journalists, bloggers, and local news.',
        image: '/services/eventpulse.png'
    },

    'booking-systems': {
        title: 'Booking / Ticketing System',
        description: 'Reservation systems for salons, events, and rentals.',
        image: '/services/eventpulse.png'
    },

    'education-websites': {
        title: 'School / Institute Website',
        description: 'Digital presence for schools and tuition centers.',
        image: '/services/eventpulse.png'
    },

    //graphic

    'logo-design': {
        title: 'Branding & Identity Design',
        description: 'Crafting logos and visuals that define your brand.',
        image: '/services/eventpulse.png'
    },
    'socialmedia-post-design': {
        title: 'Social Media Design',
        description: 'Eye-catching posts and banners for all platforms.',
        image: '/services/eventpulse.png'
    },
    'promotional-design': {
        title: 'Marketing & Promotional',
        description: 'Designs that boost your campaigns and sales.',
        image: '/services/eventpulse.png'
    },
    'stationery-design': {
        title: 'Print & Stationery Design',
        description: 'Stylish business cards, flyers, and letterheads.',
        image: '/services/eventpulse.png'
    },
    'webgraphic': {
        title: 'Digital & Web Graphics',
        description: 'Graphics that make your website and apps pop.',
        image: '/services/eventpulse.png'
    },


    //video

    'short-form-video-editing': {
        title: 'Short-Form Video Editing',
        description: 'Attention-grabbing vertical videos for Reels, Shorts & TikTok.',
        image: '/services/eventpulse.png'
    },
    'long-form-video-editing': {
        title: 'Long-Form Video Editing',
        description: 'Polished edits for YouTube, podcasts & long-form content.',
        image: '/services/eventpulse.png'
    },
    'social-media-video-editing': {
        title: 'Social Media Video Editing',
        description: 'Eye-catching promo & ad videos for all platforms.',
        image: '/services/eventpulse.png'
    },
    'motion-graphic-and-annimation': {
        title: 'Motion Graphics & Animation',
        description: 'Simple yet powerful motion graphic to boost brand presence.',
        image: '/services/eventpulse.png'
    },
    'corporate-and-business-videos': {
        title: 'Corporate & Business Videos',
        description: 'Expert video edits for brands & businesses.',
        image: '/services/eventpulse.png'
    },
    'content-creator-video-editing': {
        title: 'Content Creator Editing',
        description: 'Energetic edits made for streamers, YouTubers, and online creators.',
        image: '/services/eventpulse.png'
    }
};

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const service = servicesData[slug];

    if (!service) {
        return {
            title: 'Service Not Found | Frame Toque',
            description: 'The requested service page could not be found.'
        };
    }

    return {
        title: `${service.title} | Frame Toque`,
        description: service.description,
        openGraph: {
            title: `${service.title} | Frame Toque`,
            description: service.description,
            url: `https://frametoque.online/services/${slug}`,
            siteName: 'Frame Toque',
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
            title: `${service.title} | Frame Toque`,
            description: service.description,
            images: [`https://frametoque.online${service.image}`],
        },
    };
}

export default async function ServicePage({ params }) {
    const { slug } = await params;
    const service = servicesData[slug];

    if (!service) {
        notFound();
    }

    return <ServiceDataPage serviceType={slug} />;
}