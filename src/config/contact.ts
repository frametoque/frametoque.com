export interface ContactConfig {
  emails: {
    general: string;
    digital: string;
    productions: string;
    framebooks: string;
    careers: string;
    rentals: string;
    marketing: string;
    security: string;
    domains: string;
  };
  phones: {
    primary: {
      display: string;
      raw: string;
      tel: string;
    };
    secondary: {
      display: string;
      raw: string;
      tel: string;
    };
  };
  whatsapp: {
    rentals: {
      number: string;
      display: string;
      url: string;
    };
    general: {
      number: string;
      display: string;
      url: string;
    };
  };
  address: {
    street: string;
    city: string;
    country: string;
    full: string;
    googleMapsUrl: string;
  };
  businessRegNo?: string;
}

export const CONTACT: ContactConfig = {
  emails: {
    general: "info@frametoque.com",
    digital: "digital@frametoque.com",
    productions: "productions@frametoque.com",
    framebooks: "framebooks@frametoque.com",
    careers: "careers@frametoque.com",
    rentals: "rentals@frametoque.com",
    marketing: "marketing@frametoque.com",
    security: "security@frametoque.com",
    domains: "domains@frametoque.com",
  },
  phones: {
    primary: {
      display: "+94 70 190 1461",
      raw: "94701901461",
      tel: "tel:+94701901461",
    },
    secondary: {
      display: "+94 75 860 9356",
      raw: "94758609356",
      tel: "tel:+94758609356",
    },
  },
  whatsapp: {
    rentals: {
      number: "94701901461",
      display: "+94 70 190 1461",
      url: "https://wa.me/94701901461",
    },
    general: {
      number: "94701901461",
      display: "+94 70 190 1461",
      url: "https://wa.me/94701901461",
    },
  },
  address: {
    street: "35, Kopiwaththa Road",
    city: "Piliyandala",
    country: "Sri Lanka",
    full: "35, Kopiwaththa Road, Piliyandala, Sri Lanka",
    googleMapsUrl: "https://share.google/8O9paXxs7VBKoAZlR",
  },
  businessRegNo: "", // Put business registration number here e.g. PV XXXXX
};
