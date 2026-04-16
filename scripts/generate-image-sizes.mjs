import sharp from "sharp";
import fs from "fs";
import path from "path";

const BASE = "public/projects/photography";

const events = [
  { name: "Cambrian Carnival 23'", folder: "Cambrian Carnival 23'" },
  { name: "Evendor 25'",           folder: "Evendor 25'"           },
];

const results = [];

for (const event of events) {
  const dir = path.join(BASE, event.folder);
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  const images = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const meta = await sharp(fullPath).metadata();
    const src = `/projects/photography/${event.folder}/${file}`;
    images.push({ src, width: meta.width, height: meta.height });
  }

  results.push({ name: event.name, images });
}

// Write output as TS
let output = `export interface PhotographyImage {
  src: string;
  width: number;
  height: number;
}

export interface PhotographyEvent {
  name: string;
  images: PhotographyImage[];
}

export const photographyEvents: PhotographyEvent[] = [\n`;

for (const event of results) {
  output += `  {\n    name: ${JSON.stringify(event.name)},\n    images: [\n`;
  for (const img of event.images) {
    output += `      { src: ${JSON.stringify(img.src)}, width: ${img.width}, height: ${img.height} },\n`;
  }
  output += `    ]\n  },\n`;
}

output += `];\n\nexport const photographyImages = photographyEvents.flatMap(e => e.images);\n`;

fs.writeFileSync("src/components/projects/photography-data.ts", output);
console.log("✅ Written to src/components/projects/photography-data.ts");
