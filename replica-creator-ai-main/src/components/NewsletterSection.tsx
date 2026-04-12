import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="bg-newsletter py-16 px-4">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-newsletter-foreground text-xl tracking-[0.4em] uppercase font-heading font-light mb-3">
          Follow Our Updates
        </h2>
        <p className="text-newsletter-foreground/60 text-sm mb-8 font-body">
          Subscribe to receive the hottest news and information about updates and future events!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Input
            type="email"
            placeholder="Your email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent border-newsletter-foreground/30 text-newsletter-foreground placeholder:text-newsletter-foreground/40 max-w-xs"
          />
          <Button variant="outline" className="tracking-[0.3em] uppercase text-xs border-newsletter-foreground/50 text-newsletter-foreground hover:bg-newsletter-foreground hover:text-newsletter px-8">
            Subscribe
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
