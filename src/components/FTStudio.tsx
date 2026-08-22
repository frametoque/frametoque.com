import Image from "next/image";
import Link from "next/link";

export default function CollabCompact() {
  return (
    <Link
      href="https://aistudio.frametoque.com"
      target="_blank"
      className="block w-full transition-opacity duration-300 hover:opacity-95"
    >
      <Image
        src="/frame.png"
        alt="FT Studio Banner"
        width={1920}
        height={480}
        className="w-full h-[250px] md:h-[350px] lg:h-[480px] object-cover object-center"
        priority
      />
    </Link>
  );
}
