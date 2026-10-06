import sharp from "sharp";
import { mkdir } from "node:fs/promises";
async function main() {
  await mkdir("public/demo", { recursive: true });
  for (let i = 1; i <= 15; i++) {
    const colors = ["#d7e5f2", "#e5dfd3", "#dce8de"];
    const background = colors[i % 3];
    const shape =
      i % 3 === 0
        ? '<rect x="230" y="120" width="340" height="320" rx="12" fill="#1b4f8f"/><rect x="248" y="138" width="302" height="280" fill="#f7f9fc"/>'
        : i % 3 === 1
          ? '<rect x="180" y="180" width="440" height="250" rx="16" fill="#475569"/><rect x="200" y="198" width="400" height="200" fill="#eaf2fb"/>'
          : '<path d="M300 130h200l60 110-60 30v190H300V270l-60-30z" fill="#f7f9fc" stroke="#94a3b8" stroke-width="4"/>';
    const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="${background}"/>${shape}<text x="400" y="545" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#475569">DEMO ${String(i).padStart(2, "0")}</text></svg>`;
    await sharp(Buffer.from(svg))
      .webp({ quality: 85 })
      .toFile(`public/demo/${i}.webp`);
  }
}
main();
