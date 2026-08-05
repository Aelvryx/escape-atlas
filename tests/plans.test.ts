import assert from 'node:assert/strict';
import test from 'node:test';
import { pricingFeatureRows, pricingPlanById, pricingPlans } from '../src/lib/plans';

test('keeps the launch pricing contract exact and unambiguous', () => {
  assert.deepEqual(pricingPlans.map((plan) => plan.id), ['free', 'enthusiast', 'group']);
  assert.deepEqual(pricingPlans.map((plan) => plan.monthlyPence), [0, 300, 800]);
  assert.deepEqual(pricingPlans.map((plan) => plan.roomLimit), [25, null, null]);
  assert.deepEqual(pricingPlans.map((plan) => plan.memberLimit), [1, 1, 6]);
  assert.equal(new Set(pricingPlans.map((plan) => plan.id)).size, pricingPlans.length);
});

test('has one highlighted plan and complete comparison values', () => {
  assert.deepEqual(pricingPlans.filter((plan) => plan.highlighted).map((plan) => plan.id), ['enthusiast']);
  assert.ok(pricingFeatureRows.length >= 7);

  for (const feature of pricingFeatureRows) {
    assert.ok(feature.label.trim());
    for (const plan of pricingPlans) assert.ok(feature.values[plan.id].trim());
  }
});

test('resolves only known public plan identifiers', () => {
  assert.equal(pricingPlanById('enthusiast')?.monthlyPence, 300);
  assert.equal(pricingPlanById('group')?.memberLimit, 6);
  assert.equal(pricingPlanById('enterprise'), null);
  assert.equal(pricingPlanById(''), null);
});

