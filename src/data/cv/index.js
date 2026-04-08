// /src/data/cv/index.js

const modules = import.meta.glob("./*.json", { eager: true });

export const CV_SAMPLES = Object.values(modules)
  .map((mod) => mod.default || mod)
  .sort((a, b) => a.label.localeCompare(b.label));
