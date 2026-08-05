import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { socialCards, type SocialCard } from '../src/lib/social';

const root = resolve(import.meta.dirname, '..');
const checking = process.argv.includes('--check');

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderCard(card: SocialCard): string {
  const titleStart = card.titleLines.length === 1 ? 260 : 220;
  const title = card.titleLines
    .map((line, index) => `<text x="86" y="${titleStart + index * 82}" class="title">${escapeXml(line)}</text>`)
    .join('');
  const highlights = card.highlights
    .map((highlight, index) => {
      const x = 86 + index * 250;
      return `<g><circle cx="${x}" cy="548" r="5" fill="#58c4b7"/><text x="${x + 17}" y="555" class="highlight">${escapeXml(highlight)}</text></g>`;
    })
    .join('');

  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#071015"/>
          <stop offset="0.6" stop-color="#0c1a20"/>
          <stop offset="1" stop-color="#102c2d"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.86" cy="0.15" r="0.75">
          <stop offset="0" stop-color="#58c4b7" stop-opacity="0.34"/>
          <stop offset="1" stop-color="#58c4b7" stop-opacity="0"/>
        </radialGradient>
        <style>
          .sans { font-family: Arial, Helvetica, sans-serif; }
          .eyebrow { font: 700 20px Arial, Helvetica, sans-serif; letter-spacing: 6px; fill: #58c4b7; }
          .title { font: 600 68px Georgia, 'Times New Roman', serif; fill: #f5f0e7; }
          .subtitle { font: 400 24px Arial, Helvetica, sans-serif; fill: #a9b8b7; }
          .metric { font: 600 70px Georgia, 'Times New Roman', serif; fill: #f4b860; }
          .metric-label { font: 700 18px Arial, Helvetica, sans-serif; letter-spacing: 2px; fill: #d8e2df; }
          .highlight { font: 600 18px Arial, Helvetica, sans-serif; fill: #d8e2df; }
          .domain { font: 700 17px Arial, Helvetica, sans-serif; letter-spacing: 2px; fill: #8aa19f; }
        </style>
      </defs>
      <rect width="1200" height="630" fill="url(#background)"/>
      <rect width="1200" height="630" fill="url(#glow)"/>
      <path d="M960 -80a270 270 0 1 1-1 540a270 270 0 1 1 1-540Z" fill="none" stroke="#58c4b7" stroke-opacity="0.12" stroke-width="2"/>
      <path d="M960 20a170 170 0 1 1-1 340a170 170 0 1 1 1-340Z" fill="none" stroke="#f4b860" stroke-opacity="0.18" stroke-width="2"/>
      <path d="M960 116v148M886 190h148" stroke="#58c4b7" stroke-opacity="0.32" stroke-width="2"/>
      <rect x="52" y="48" width="1096" height="534" rx="28" fill="none" stroke="#9dc9c2" stroke-opacity="0.18"/>
      <text x="86" y="112" class="eyebrow">${escapeXml(card.eyebrow)}</text>
      ${title}
      <text x="86" y="${titleStart + card.titleLines.length * 82 + 34}" class="subtitle">${escapeXml(card.subtitle)}</text>
      <g transform="translate(845 338)">
        <text x="0" y="0" class="metric">${escapeXml(card.metric)}</text>
        <text x="3" y="34" class="metric-label">${escapeXml(card.metricLabel.toUpperCase())}</text>
      </g>
      <path d="M86 512H1114" stroke="#9dc9c2" stroke-opacity="0.18"/>
      ${highlights}
      <text x="1114" y="555" text-anchor="end" class="domain">ATLAS.MEI.PLACE</text>
    </svg>`;
}

async function renderPng(card: SocialCard): Promise<Buffer> {
  return sharp(Buffer.from(renderCard(card))).png({ compressionLevel: 9, palette: true }).toBuffer();
}

for (const card of socialCards) {
  const outputPath = resolve(root, card.outputPath);
  const generated = await renderPng(card);

  if (checking) {
    let existing: Buffer;
    try {
      existing = await readFile(outputPath);
    } catch {
      throw new Error(`${card.outputPath} is missing; run npm run social:generate`);
    }
    if (!generated.equals(existing)) {
      throw new Error(`${card.outputPath} is stale; run npm run social:generate`);
    }
    continue;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated);
  console.log(`Generated ${card.outputPath}`);
}

if (checking) console.log(`Verified ${socialCards.length} generated social cards`);
