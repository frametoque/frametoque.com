export interface BrandConfig {
  id: "parent" | "digital" | "productions" | "rental" | "framebooks";
  name: string;
  shortName: string;
  tagline: string;
  route: string;
  externalUrl?: string;
  logo: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  accentLabel: string;
  email: string;
}

export const BRANDS: Record<BrandConfig["id"], BrandConfig> = {
  parent: {
    id: "parent",
    name: "Frametoque Digital Productions",
    shortName: "Frametoque",
    tagline: "Simple. Better. Fast.",
    route: "/",
    logo: {
      src: "/logos/ft/name-logo.png", // TODO: replace with custom logo when brand assets are finalized
      alt: "Frametoque Digital Productions",
      width: 200,
      height: 40,
    },
    accentLabel: "Digital Productions",
    email: "info@frametoque.com",
  },
  digital: {
    id: "digital",
    name: "Frametoque Digital",
    shortName: "Digital",
    tagline: "High-performance web development, graphic design & digital products.",
    route: "/digital",
    logo: {
      src: "/logos/ft/name-logo.png", // TODO: replace with custom logo
      alt: "Frametoque Digital",
      width: 200,
      height: 40,
    },
    accentLabel: "Web & Graphics",
    email: "info@frametoque.com",
  },
  productions: {
    id: "productions",
    name: "Frametoque Productions",
    shortName: "Productions",
    tagline: "Cinematic videography, photography & commercial video editing.",
    route: "/productions",
    logo: {
      src: "/logos/ft/name-logo.png", // TODO: replace with custom logo
      alt: "Frametoque Productions",
      width: 200,
      height: 40,
    },
    accentLabel: "Photo & Video",
    email: "productions@frametoque.com",
  },
  rental: {
    id: "rental",
    name: "Frametoque Rentals",
    shortName: "Rentals",
    tagline: "Professional cinema camera & filmmaking equipment hire in Sri Lanka.",
    route: "/rentals",
    logo: {
      src: "/logos/ft/name-logo.png", // TODO: replace with custom logo
      alt: "Frametoque Rentals",
      width: 200,
      height: 40,
    },
    accentLabel: "Equipment Hire",
    email: "rentals@frametoque.com",
  },
  framebooks: {
    id: "framebooks",
    name: "Framebooks",
    shortName: "Framebooks",
    tagline: "Proprietary cloud ERP & accounting software engineered by Frametoque Digital.",
    route: "/digital#saas",
    externalUrl: "https://books.frametoque.com",
    logo: {
      src: "/logos/ft/name-logo.png", // TODO: replace with custom logo
      alt: "Framebooks",
      width: 200,
      height: 40,
    },
    accentLabel: "SaaS by Frametoque Digital",
    email: "framebooks@frametoque.com",
  },
};
