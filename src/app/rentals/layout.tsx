import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { 
  Phone, 
  MessageCircle, 
} from "lucide-react";
import { getPublicRentalCategories } from "../actions/rentals-public";
import RentalHeader from "./RentalHeader";
import { RentalKitProvider } from "@/context/RentalKitContext";
import ShootKitDrawer from "@/components/rentals/ShootKitDrawer";

export const metadata: Metadata = {
  metadataBase: new URL("https://frametoque.com"),
  title: {
    default: "Camera & Equipment Rental Sri Lanka | Frametoque Rental",
    template: "%s | Frametoque Rental",
  },
  description: "Rent professional cinema cameras, lenses, lighting, audio gear, and stabilization support in Colombo, Sri Lanka. Check real-time shoot availability and book directly via WhatsApp.",
  keywords: [
    "camera rental sri lanka",
    "camera hire colombo",
    "video equipment rental sri lanka",
    "lens rental sri lanka",
    "sony fx3 rental sri lanka",
    "cinema camera rental colombo",
    "filmmaking gear rental",
    "frametoque rental",
    "production gear sri lanka",
    "aputure lighting hire colombo",
    "wireless microphone rental colombo",
    "gimbal rental sri lanka",
    "audio gear hire colombo"
  ],
  authors: [{ name: "Frametoque Digital Productions", url: "https://frametoque.com" }],
  creator: "Frametoque Digital Productions",
  publisher: "Frametoque Digital Productions",
  alternates: {
    canonical: "https://frametoque.com/rentals",
  },
  openGraph: {
    title: "Camera & Equipment Rental Sri Lanka | Frametoque Rental",
    description: "Rent professional cinema cameras, lenses, lighting, audio gear, and accessories in Colombo, Sri Lanka. Live date availability.",
    url: "https://frametoque.com/rentals",
    siteName: "Frametoque Rental",
    locale: "en_LK",
    type: "website",
    images: [
      {
        url: "https://frametoque.com/logos/ft/name-logo.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Rental Sri Lanka",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Camera & Equipment Rental Sri Lanka | Frametoque Rental",
    description: "Rent professional cinema cameras, lenses, lighting, and audio equipment in Colombo, Sri Lanka.",
    images: ["https://frametoque.com/logos/ft/name-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RentalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let categories: { category: string; count: number }[] = [];
  try {
    categories = await getPublicRentalCategories();
  } catch (err) {
    console.error("Failed to load rental categories for layout:", err);
  }

  // Pick only top 5 dynamic categories
  const topCategories = categories.slice(0, 5);

  return (
    <RentalKitProvider>
      <div 
        className="rental-theme min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-brand-500 selection:text-white"
        style={{ colorScheme: "light" }}
      >
        {/* Light Theme Public Header with Hamburger Side Menu */}
        <RentalHeader />

        {/* Main Content Area */}
        <main className="min-h-[calc(100vh-140px)]">
          {children}
        </main>

        {/* Bag Slide-Over Drawer */}
        <ShootKitDrawer />

        {/* Light Theme Public Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-12 sm:mt-20 pt-10 sm:pt-16 pb-8 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-12">
            
            {/* Brand column */}
            <div className="space-y-4 md:col-span-1">
              <Link href="/rentals" className="inline-flex items-center gap-2 group">
                <Image
                  src="/logos/ft/name-logo.png"
                  alt="Frametoque"
                  width={150}
                  height={30}
                  className="h-auto w-28 sm:w-32 brightness-0 transition-opacity hover:opacity-80"
                />
                <span className="text-xs font-bold tracking-wider text-brand-600 select-none">
                  | RENTALS
                </span>
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                <span>+94 70 190 1461</span>
              </div>
              <div className="pt-1">
                <a
                  href="https://wa.me/94701901461?text=Hi%20Frametoque%20Team%2C%20I'm%20inquiring%20about%20equipment%20rentals."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Message Us</span>
                </a>
              </div>
            </div>

            {/* Dynamic Equipment Categories (Top 5) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
                Equipment Categories
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {topCategories.length > 0 ? (
                  topCategories.map((cat) => (
                    <li key={cat.category}>
                      <Link
                        href={`/rentals?category=${encodeURIComponent(cat.category)}`}
                        className="hover:text-brand-600 transition-colors"
                      >
                        {cat.category}
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li><Link href="/rentals?category=Camera" className="hover:text-brand-600 transition-colors">Camera</Link></li>
                    <li><Link href="/rentals?category=Lens" className="hover:text-brand-600 transition-colors">Lens</Link></li>
                    <li><Link href="/rentals?category=Lighting" className="hover:text-brand-600 transition-colors">Lighting</Link></li>
                    <li><Link href="/rentals?category=Audio" className="hover:text-brand-600 transition-colors">Audio</Link></li>
                    <li><Link href="/rentals?category=Mounts%20%26%20Tripods" className="hover:text-brand-600 transition-colors">Mounts &amp; Tripods</Link></li>
                    <li><Link href="/rentals?category=Accessories" className="hover:text-brand-600 transition-colors">Accessories</Link></li>
                  </>
                )}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
                Rental Info
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link href="/rentals/faq" className="hover:text-brand-600 transition-colors">Frequently Asked Questions</Link></li>
                <li><Link href="/rentals/terms" className="hover:text-brand-600 transition-colors">Terms &amp; Rental Conditions</Link></li>
                <li><Link href="/rentals/contact" className="hover:text-brand-600 transition-colors">Rental Desk &amp; Inquiries</Link></li>
                <li><a href="mailto:rentals@frametoque.com" className="hover:text-brand-600 transition-colors font-mono">rentals@frametoque.com</a></li>
                <li className="pt-2 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Frametoque Arms</li>
                <li><Link href="/digital" className="hover:text-brand-600 transition-colors">Frametoque Digital</Link></li>
                <li><Link href="/productions" className="hover:text-brand-600 transition-colors">Frametoque Productions</Link></li>
                <li><a href="https://books.frametoque.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">Framebooks ERP ↗</a></li>
              </ul>
            </div>

            {/* Direct Booking Column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Rental Desk Hours
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Open Daily: 8:00 AM – 9:00 PM<br />
                Pickup &amp; Dropoff by appointment at:<br />
                35, Kopiwaththa Road, Piliyandala.
              </p>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} Frametoque Digital Productions. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/rentals/faq" className="hover:text-slate-800 transition-colors">FAQ</Link>
              <Link href="/rentals/terms" className="hover:text-slate-800 transition-colors">Terms of Service</Link>
              <Link href="/" className="hover:text-brand-600 transition-colors">Parent Company</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </RentalKitProvider>
  );
}
