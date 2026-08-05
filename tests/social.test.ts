import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  escapeAtlasOrigin,
  profileShare,
  profileSocialCard,
  socialCards,
} from '../src/lib/social';

test('defines complete and unique social-card metadata', () => {
  assert.deepEqual(socialCards.map((card) => card.id), ['product', 'profile']);
  assert.equal(new Set(socialCards.map((card) => card.publicPath)).size, socialCards.length);

  for (const card of socialCards) {
    assert.match(card.publicPath, /^\/social\/[a-z-]+\.png$/);
    assert.equal(card.highlights.length, 3);
    assert.ok(card.titleLines.every((line) => line.trim().length > 0));
    assert.ok(card.alt.trim().length >= 40);
  }
});

test('keeps the profile share link canonical and attributable', () => {
  const url = new URL(profileShare.url);
  assert.equal(url.origin, escapeAtlasOrigin);
  assert.equal(url.pathname, '/u/anthony-and-trenna/');
  assert.equal(url.searchParams.get('utm_source'), 'profile_share');
  assert.equal(url.searchParams.get('utm_medium'), 'web_share');
  assert.equal(url.searchParams.get('utm_campaign'), 'early_access');
  assert.equal(profileShare.cardPath, profileSocialCard.publicPath);
});

test('commits correctly sized PNG cards', async () => {
  for (const card of socialCards) {
    const bytes = await readFile(card.outputPath);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
  }
});
