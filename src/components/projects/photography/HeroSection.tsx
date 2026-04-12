import { photographyImages } from "./images";

const HeroSection = () => {
  const heroImage = photographyImages.length > 0 ? photographyImages[0] : "/projects/photography/hero-photographer.jpg";

  return (
    <section className="relative h-[40vh] md:h-[35vh] w-full overflow-hidden flex items-center justify-center">
      <img
        src={heroImage}
        alt="World class photography"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-black/60 bg-gradient-to-b from-black/20 to-black/80" />
      
    </section>
  );
};

export default HeroSection;
