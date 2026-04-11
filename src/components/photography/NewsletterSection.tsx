"use client";

import { useState } from "react";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In a real app, you would handle the subscription here
      console.log("Subscribing email:", email);
      setEmail("");
    }
  };

  return (
    <section className="bg-black py-24 px-4 text-white border-t border-white/5">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-xl tracking-[0.4em] uppercase font-light mb-4">
          Follow Our Updates
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-md mx-auto">
          Subscribe to receive the hottest news and information about updates and future events!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <input
            type="email"
            placeholder="Your email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full sm:w-80 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 px-6 py-3 rounded-full focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            required
          />
          <button type="submit" className="px-8 py-3 rounded-full font-medium text-sm shadow-lg shadow-brand-500/30 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white hover:opacity-90 transition-opacity uppercase tracking-widest w-full sm:w-auto">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterSection;
