import { profileStats, publicProfile } from './profile';

export const escapeAtlasOrigin = 'https://atlas.mei.place';

export interface SocialCard {
  id: 'product' | 'profile';
  publicPath: string;
  outputPath: string;
  eyebrow: string;
  titleLines: readonly string[];
  subtitle: string;
  metric: string;
  metricLabel: string;
  highlights: readonly string[];
  alt: string;
}

export const socialCards = [
  {
    id: 'product',
    publicPath: '/social/escape-atlas.png',
    outputPath: 'public/social/escape-atlas.png',
    eyebrow: 'ESCAPE ATLAS',
    titleLines: ['A better home for', 'every escape.'],
    subtitle: 'Bring the spreadsheet. Keep the story. Plan the next room.',
    metric: '£0 · £3 · £8',
    metricLabel: 'simple early-access plans',
    highlights: ['Public profiles', 'CSV import', 'Trip planning'],
    alt: 'Escape Atlas — a better home for every escape, with public profiles, CSV import and trip planning.',
  },
  {
    id: 'profile',
    publicPath: '/social/anthony-and-trenna.png',
    outputPath: 'public/social/anthony-and-trenna.png',
    eyebrow: 'PUBLIC ESCAPE PROFILE',
    titleLines: [publicProfile.displayName],
    subtitle: 'A shared map of every puzzle, panic and last-second breakthrough.',
    metric: String(profileStats.rooms),
    metricLabel: 'rooms logged',
    highlights: [
      `${profileStats.locations} locations`,
      `${profileStats.venues} operators`,
      `Escaping since ${profileStats.firstRoom.date.slice(0, 4)}`,
    ],
    alt: `${publicProfile.displayName}'s Escape Atlas profile: ${profileStats.rooms} rooms across ${profileStats.locations} locations.`,
  },
] as const satisfies readonly SocialCard[];

export const productSocialCard = socialCards[0];
export const profileSocialCard = socialCards[1];

export const profileShare = {
  title: `${publicProfile.displayName} on Escape Atlas`,
  text: `${publicProfile.displayName} have logged ${profileStats.rooms} escape rooms across ${profileStats.locations} locations. Explore their Escape Atlas.`,
  url: `${escapeAtlasOrigin}/u/${publicProfile.slug}/?utm_source=profile_share&utm_medium=web_share&utm_campaign=early_access`,
  cardPath: profileSocialCard.publicPath,
} as const;
