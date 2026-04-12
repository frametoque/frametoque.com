import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";
import gallery5 from "@/assets/gallery-5.jpg";
import gallery6 from "@/assets/gallery-6.jpg";
import gallery7 from "@/assets/gallery-7.jpg";
import gallery8 from "@/assets/gallery-8.jpg";
import gallery9 from "@/assets/gallery-9.jpg";
import gallery10 from "@/assets/gallery-10.jpg";
import gallery11 from "@/assets/gallery-11.jpg";
import { Button } from "@/components/ui/button";

const rows = [
  [gallery1, gallery2, gallery3],
  [gallery4, gallery5],
  [gallery6, gallery7, gallery8],
  [gallery9, gallery10, gallery11],
];

const GallerySection = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <h2 className="text-center text-2xl tracking-[0.4em] uppercase font-heading font-light text-foreground mb-12">
        Our Latest Works
      </h2>

      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {/* Row 1: 3 equal */}
        <div className="grid grid-cols-3 gap-4">
          {rows[0].map((src, i) => (
            <div key={i} className="overflow-hidden group">
              <img
                src={src}
                alt="Gallery photo"
                loading="lazy"
                className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Row 2: 2 images, one wider */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 overflow-hidden group">
            <img
              src={rows[1][0]}
              alt="Gallery photo"
              loading="lazy"
              className="w-full h-72 object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
            />
          </div>
          <div className="col-span-3 overflow-hidden group">
            <img
              src={rows[1][1]}
              alt="Gallery photo"
              loading="lazy"
              className="w-full h-72 object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Row 3: 3 equal */}
        <div className="grid grid-cols-3 gap-4">
          {rows[2].map((src, i) => (
            <div key={i} className="overflow-hidden group">
              <img
                src={src}
                alt="Gallery photo"
                loading="lazy"
                className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Row 4: 3 equal */}
        <div className="grid grid-cols-3 gap-4">
          {rows[3].map((src, i) => (
            <div key={i} className="overflow-hidden group">
              <img
                src={src}
                alt="Gallery photo"
                loading="lazy"
                className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-12">
        <Button variant="outline" className="tracking-[0.3em] uppercase text-xs border-foreground text-foreground hover:bg-foreground hover:text-background px-8 py-3">
          Load More
        </Button>
      </div>
    </section>
  );
};

export default GallerySection;
