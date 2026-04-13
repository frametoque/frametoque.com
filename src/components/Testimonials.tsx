import Image from "next/image";

const testimonials = [
  {
    name: "NextVibe",
    role: "Solution for a Digital World",
    image:
      "/images/clients/logo/nextvibe.png",
    content:
      "It was a great experience working with this video editing team. Very professional, creative, and responsive throughout the project. They clearly understood the vision and delivered high-quality results on time. Highly recommended for anyone looking for reliable video editing services.",
  },

];

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-24 sm:py-32 px-6 sm:px-10 lg:px-16 relative bg-black overflow-hidden"
    >
      {/* Subtle background glow removed */}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20">
          <div className="lg:w-1/2 w-full text-center lg:text-left">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent block">
                What Clients&nbsp;
              </span>
              <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent block">
                Say About Us
              </span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Our clients love what we do. See how we've helped businesses and
              creators grow with stunning designs, fast websites, and cinematic
              videos.
            </p>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="grid gap-6 sm:gap-8">
              {testimonials.map((testimonial, key) => (
                <div
                  key={key}
                  className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-2xl hover:border-brand-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10"
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <div className="text-4xl sm:text-5xl font-serif bg-gradient-to-br from-brand-400 to-brand-600 bg-clip-text text-transparent opacity-50 font-bold leading-none">
                        “
                      </div>
                    </div>

                    <div className="flex-grow">
                      <p className="text-gray-200 text-base sm:text-lg leading-relaxed mb-6 italic">
                        {testimonial.content}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Image
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full object-cover border border-white/10"
                            width={48}
                            height={48}
                          />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">
                            {testimonial.name}
                          </h3>
                          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mt-0.5">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
