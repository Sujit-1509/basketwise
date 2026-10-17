// Original vector packaging illustrations. No remote image requests or brand assets.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(
  new URL("../frontend/public/images/", import.meta.url),
);
mkdirSync(dir, { recursive: true });
const products = {
  atta: ["WHOLE WHEAT", "ATTA", "#ae633a", "#f4e7c8", "grain"],
  rice: ["EVERYDAY", "BASMATI", "#46765b", "#f6efda", "grain"],
  sugar: ["FINE WHITE", "SUGAR", "#728f9e", "#f5f1de", "grain"],
  lentils: ["NATURALLY GOOD", "DAL", "#bc8148", "#f4e4b7", "grain"],
  oil: ["GOLDEN DROP", "SUNFLOWER", "#c08b31", "#f7d16c", "bottle"],
  milk: ["MORNING DAIRY", "FRESH MILK", "#497d84", "#f8f4e4", "milk"],
  oats: ["GRAIN & GOOD", "ROLLED OATS", "#946343", "#ede1be", "grain"],
  eggs: ["FARM BASKET", "FARM EGGS", "#81765b", "#e1d6b7", "eggs"],
  tea: ["HILL GARDEN", "LEAF TEA", "#426448", "#d6ddbd", "box"],
  coffee: ["HILL GARDEN", "COFFEE", "#654a3d", "#e9d7b1", "box"],
  salt: ["PANTRY CO.", "IODISED SALT", "#738c90", "#f6f3e7", "grain"],
  spice: ["SPICE ROUTE", "PURE SPICE", "#aa573b", "#f4d390", "grain"],
  ghee: ["MORNING DAIRY", "PURE GHEE", "#a17d35", "#f2dc8b", "jar"],
  curd: ["MORNING DAIRY", "FRESH CURD", "#678c74", "#fff8e7", "jar"],
  paneer: ["MORNING DAIRY", "PANEER", "#62868b", "#f1f2e4", "box"],
  bread: ["BAKER STREET", "WHOLE WHEAT", "#a6774a", "#e8cf9f", "box"],
  butter: ["NUT GROVE", "PEANUT BUTTER", "#a77340", "#d5ab70", "jar"],
  nuts: ["NUT GROVE", "ALMONDS", "#846744", "#ebdfc3", "grain"],
  biscuits: ["BAKER STREET", "MARIE", "#a17743", "#eddaae", "box"],
};
for (const [name, [brand, label, ink, paper, shape]] of Object.entries(
  products,
)) {
  const body =
    shape === "bottle"
      ? `<path d="M77 46h46v26c0 12 19 17 19 35v88c0 9-8 13-17 13H75c-9 0-17-4-17-13v-88c0-18 19-23 19-35z" fill="${paper}"/><rect x="75" y="35" width="50" height="21" rx="4" fill="${ink}"/>`
      : shape === "milk"
        ? `<path d="M67 52l20-20h38l13 25v143H62V57z" fill="${paper}"/><path d="M87 32v25h51l-13-25z" fill="#bad0c8"/><path d="M62 57h76v18H62z" fill="${ink}"/><rect x="104" y="32" width="14" height="8" rx="3" fill="${ink}"/>`
        : shape === "jar"
          ? `<rect x="53" y="59" width="94" height="145" rx="18" fill="${paper}"/><rect x="50" y="48" width="100" height="24" rx="7" fill="${ink}"/>`
          : shape === "eggs"
            ? `<path d="M35 99l15-28h102l15 28-10 80H45z" fill="${paper}"/><path d="M35 99h132v18H35z" fill="${ink}"/>`
            : shape === "box"
              ? `<rect x="48" y="42" width="104" height="162" rx="5" fill="${paper}"/><path d="M48 42h104v14H48z" fill="${ink}"/>`
              : `<path d="M54 37h92l-5 17 12 141c0 9-8 13-18 13H65c-10 0-18-4-18-13L59 54z" fill="${paper}"/><path d="M54 37h92v13H54z" fill="${ink}"/><path d="M49 191h102l-3 14H52z" fill="${ink}" opacity=".25"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240"><ellipse cx="100" cy="215" rx="54" ry="7" fill="#33462e" opacity=".08"/>${body}<rect x="59" y="88" width="82" height="83" rx="3" fill="${ink}"/><text x="100" y="103" fill="${paper}" text-anchor="middle" font-family="Georgia,serif" font-size="6" letter-spacing=".6">${brand.replaceAll("&", "&amp;")}</text><path d="M100 116v21m0-15q-13-12-13-2 0 8 13 8m0-4q13-15 13-5 0 8-13 13" fill="none" stroke="${paper}" stroke-width="1.4"/><text x="100" y="151" fill="${paper}" text-anchor="middle" font-family="Georgia,serif" font-size="9" letter-spacing=".6">${label}</text><text x="100" y="163" fill="${paper}" text-anchor="middle" font-family="Arial,sans-serif" font-size="4.4" letter-spacing="1.1">EVERYDAY ESSENTIALS</text><path d="M68 183h64" stroke="${ink}" opacity=".3"/><text x="100" y="193" fill="${ink}" text-anchor="middle" font-family="Arial,sans-serif" font-size="5">ILLUSTRATIVE PRODUCT</text></svg>`;
  writeFileSync(`${dir}${name}.svg`, svg);
}
console.log(
  `Generated ${Object.keys(products).length} original SVG illustrations.`,
);
