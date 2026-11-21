export interface SocialLink {
  name: string;
  url: string;
  username: string;
}

export interface BrandSocials {
  brandId: "parent" | "digital" | "productions" | "rental" | "framebooks";
  links: SocialLink[];
}

export const SOCIALS: Record<BrandSocials["brandId"], SocialLink[]> = {
  parent: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/frametoque/",
      username: "Frametoque",
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@Frametoque",
      username: "@Frametoque",
    },
  ],
  digital: [
    {
      name: "Instagram",
      url: "https://instagram.com/frametoque.digital",
      username: "@frametoque.digital",
    },
    {
      name: "Facebook",
      url: "https://facebook.com/frametoque.digital",
      username: "@frametoque.digital",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/frametoque/",
      username: "Frametoque",
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@Frametoque",
      username: "@Frametoque",
    },
    {
      name: "TikTok",
      url: "https://tiktok.com/@frametoque.digital",
      username: "@frametoque.digital",
    },
  ],
  productions: [
    {
      name: "Instagram",
      url: "https://instagram.com/frametoque.productions",
      username: "@frametoque.productions",
    },
    {
      name: "Facebook",
      url: "https://facebook.com/frametoque.productions",
      username: "@frametoque.productions",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/frametoque/",
      username: "Frametoque",
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@Frametoque",
      username: "@Frametoque",
    },
    {
      name: "TikTok",
      url: "https://tiktok.com/@frametoque.productions",
      username: "@frametoque.productions",
    },
  ],
  rental: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/frametoque/",
      username: "Frametoque",
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@Frametoque",
      username: "@Frametoque",
    },
  ],
  framebooks: [
    // Framebooks dedicated handles can be added here
  ],
};

/**
 * Returns only social links with non-empty URLs.
 */
export function getActiveSocials(brandId: BrandSocials["brandId"]): SocialLink[] {
  return (SOCIALS[brandId] || []).filter((link) => link.url && link.url.trim().length > 0);
}
