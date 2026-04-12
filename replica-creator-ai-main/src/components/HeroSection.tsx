import heroImage from "@/assets/hero-photographer.jpg";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <img
        src={heroImage}
        alt="World class photography"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))" }} />
      
      {/* Navigation */}
      <nav className="relative z-10 flex flex-col items-center pt-8 gap-4">
        <div className="flex items-center gap-2 text-primary-foreground">
          <span className="text-xs tracking-[0.3em] uppercase font-heading">Anna</span>
          <span className="text-3xl font-heading font-bold">AS</span>
          <span className="text-xs tracking-[0.3em] uppercase font-heading">Solas</span>
        </div>
        <div className="flex gap-6 text-xs tracking-[0.2em] uppercase text-primary-foreground/80">
          {["Home", "About", "Pricing", "Team", "Clients", "Blog", "Contacts"].map((item) => (
            <a key={item} href="#" className="hover:text-primary-foreground transition-colors">
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full -mt-20 text-center">
        <p className="text-primary-foreground/70 text-sm tracking-[0.4em] uppercase font-body mb-2">
          World Class
        </p>
        <h1 className="text-primary-foreground text-6xl md:text-8xl font-heading font-bold tracking-wider uppercase mb-6">
          Photography
        </h1>
        <p className="text-primary-foreground/60 text-sm max-w-lg leading-relaxed mb-8 font-body">
          Dive into amazing world of black-and-white photography full of emotions, feelings,
          beautiful faces and personalities. Enjoy this mixture of beauty and creativity!
        </p>
        <Button variant="hero" size="lg">
          Read More
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
