export type PlanId = 'free' | 'enthusiast' | 'group';

export interface PricingPlan {
  id: PlanId;
  name: string;
  monthlyPence: number;
  priceLabel: string;
  cadence: string;
  strapline: string;
  bestFor: string;
  roomLimit: number | null;
  memberLimit: number;
  highlighted: boolean;
  features: readonly string[];
  cta: {
    label: string;
    href: string;
  };
}

export interface PricingFeatureRow {
  label: string;
  values: Record<PlanId, string>;
}

export const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    monthlyPence: 0,
    priceLabel: '£0',
    cadence: 'forever',
    strapline: 'Leave the spreadsheet without taking out another subscription.',
    bestFor: 'A clean first atlas',
    roomLimit: 25,
    memberLimit: 1,
    highlighted: false,
    features: [
      'Up to 25 completed rooms',
      'Public escape profile',
      'CSV import and clean export',
      'Core activity statistics',
    ],
    cta: {
      label: 'Preview your import',
      href: '/import/',
    },
  },
  {
    id: 'enthusiast',
    name: 'Enthusiast',
    monthlyPence: 300,
    priceLabel: '£3',
    cadence: 'per month',
    strapline: 'The complete personal record for people who stopped counting casually.',
    bestFor: 'Committed escapers',
    roomLimit: null,
    memberLimit: 1,
    highlighted: true,
    features: [
      'Unlimited completed rooms',
      'Advanced profile statistics',
      'Personal trip planning',
      'No advertising',
    ],
    cta: {
      label: 'Start with your history',
      href: '/import/',
    },
  },
  {
    id: 'group',
    name: 'Group',
    monthlyPence: 800,
    priceLabel: '£8',
    cadence: 'per month',
    strapline: 'One shared atlas for the people who are always in the room together.',
    bestFor: 'Teams of up to six',
    roomLimit: null,
    memberLimit: 6,
    highlighted: false,
    features: [
      'Everything in Enthusiast',
      'Up to six group members',
      'Shared trip planning',
      'Combined group statistics',
    ],
    cta: {
      label: 'Try the route planner',
      href: '/locations/#trip-planner',
    },
  },
] as const satisfies readonly PricingPlan[];

export const pricingFeatureRows: readonly PricingFeatureRow[] = [
  {
    label: 'Completed-room history',
    values: { free: '25 rooms', enthusiast: 'Unlimited', group: 'Unlimited' },
  },
  {
    label: 'People on the atlas',
    values: { free: '1', enthusiast: '1', group: 'Up to 6' },
  },
  {
    label: 'Public profile',
    values: { free: 'Included', enthusiast: 'Included', group: 'Shared profile' },
  },
  {
    label: 'CSV import',
    values: { free: 'Included', enthusiast: 'Included', group: 'Included' },
  },
  {
    label: 'Statistics',
    values: { free: 'Core', enthusiast: 'Advanced', group: 'Advanced + group' },
  },
  {
    label: 'Trip planning',
    values: { free: '—', enthusiast: 'Personal', group: 'Shared' },
  },
  {
    label: 'Advertising',
    values: { free: 'May appear later', enthusiast: 'None', group: 'None' },
  },
];

export function pricingPlanById(id: string): PricingPlan | null {
  return pricingPlans.find((plan) => plan.id === id) ?? null;
}

