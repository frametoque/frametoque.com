export type Representative = {
  name: string;
  role: string;
  signatureText: string;
  signatureImage?: string | null;
};

export const PREDEFINED_REPRESENTATIVES: Representative[] = [
  {
    name: "Nelitha Priyawansha",
    role: "Frametoque",
    signatureText: "Nelitha Priyawansha",
    signatureImage: "/admin/agreements/signatures/nelitha.png",
  },
    {
    name: "Kavinu Pasandul",
    role: "Frametoque",
    signatureText: "Kavinu Pasandul",
    signatureImage: "/admin/agreements/signatures/kavinu.png",
  },
  {
    name: "Tharul Bandara",
    role: "Frametoque",
    signatureText: "Tharul Bandara",
    signatureImage: "/admin/agreements/signatures/tharul.png",
  },
];
