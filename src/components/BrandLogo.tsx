import Image from "next/image";
import Link from "next/link";
import { BRANDS, type BrandConfig } from "@/config/brand";

interface BrandLogoProps {
  brand?: BrandConfig["id"];
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  withLink?: boolean;
  showBadge?: boolean;
  variant?: "dark" | "light";
  size?: "sm" | "default" | "lg";
}

const SIZE_CLASSES: Record<"sm" | "default" | "lg", string> = {
  sm: "max-h-6 sm:max-h-7 w-auto max-w-[130px] sm:max-w-[155px]",
  default: "max-h-7 sm:max-h-8.5 w-auto max-w-[145px] sm:max-w-[175px]",
  lg: "max-h-8 sm:max-h-10 w-auto max-w-[160px] sm:max-w-[200px]",
};

export default function BrandLogo({
  brand = "parent",
  className = "",
  imageClassName = "",
  priority = false,
  withLink = true,
  showBadge = false,
  variant = "dark",
  size = "default",
}: BrandLogoProps) {
  const config = BRANDS[brand] || BRANDS.parent;

  // TODO: replace with custom logo once brand SVG/PNG assets are finalized for each arm
  const logoContent = (
    <div className={`inline-flex items-center gap-2 group cursor-pointer ${className}`}>
      <div className="relative flex items-center justify-center">
        <Image
          src={config.logo.src}
          alt={config.logo.alt}
          width={config.logo.width}
          height={config.logo.height}
          priority={priority}
          className={`h-auto ${SIZE_CLASSES[size]} object-contain transition-all duration-300 ${
            variant === "light" ? "brightness-0" : ""
          } ${imageClassName}`}
        />
      </div>

      {showBadge && brand !== "parent" && (
        <span
          className={`text-[10px] sm:text-xs font-bold tracking-wider uppercase select-none px-2 py-0.5 rounded-md ${
            variant === "light"
              ? "bg-slate-200 text-slate-800"
              : "bg-white/10 text-brand-300 border border-white/10"
          }`}
        >
          {config.shortName}
        </span>
      )}
    </div>
  );

  if (withLink) {
    return (
      <Link href={config.route} aria-label={config.name}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
