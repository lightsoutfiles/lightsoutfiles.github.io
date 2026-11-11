import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, deviceDailyWh } from "../src/supply.ts";

const base = { adults: 2, children: 2, pets: 1, days: 3, climate: "mild" as const, floors: 2, devices: [] };

test("water: (people + pets) x days x 1 gallon", () => {
  assert.equal(plan(base).waterGallons, 15);
  assert.equal(plan({ ...base, days: 14 }).waterGallons, 70);
});

test("water doubles in very hot climates only", () => {
  assert.equal(plan({ ...base, climate: "hot" }).waterGallons, 30);
  assert.equal(plan({ ...base, climate: "cold" }).waterGallons, 15);
});

test("food: people x days x 2,000 kcal, pets excluded, editable", () => {
  assert.equal(plan(base).foodKcal, 24000);
  assert.equal(plan({ ...base, kcalPerPersonPerDay: 1500 }).foodKcal, 18000);
});

test("CO detectors: at least one per floor", () => {
  assert.equal(plan(base).coDetectorsMin, 2);
  assert.equal(plan({ ...base, floors: 0 }).coDetectorsMin, 1);
});

test("fridge and freezer clock", () => {
  const p = plan(base);
  assert.deepEqual([p.fridgeHours, p.freezerFullHours, p.freezerHalfHours], [4, 48, 24]);
});

test("device daily Wh: watts x hours, or kWh/yr / 365 x 1000", () => {
  assert.equal(deviceDailyWh({ name: "Phone", watts: 10, hoursPerDay: 3 }), 30);
  assert.equal(deviceDailyWh({ name: "Fridge", kwhPerYear: 365 }), 1000);
  assert.equal(deviceDailyWh({ name: "Odd", watts: 10, hoursPerDay: 30 }), 240);
});

test("battery: daily Wh x days x (1 + loss), default 15%", () => {
  const devices = [
    { name: "Fridge", kwhPerYear: 365, watts: 150 },
    { name: "Phones", watts: 10, hoursPerDay: 3 },
  ];
  const p = plan({ ...base, devices });
  assert.equal(p.dailyWh, 1030);
  assert.ok(Math.abs(p.batteryWh - 1030 * 3 * 1.15) < 1e-9);
  assert.equal(plan({ ...base, devices, lossAllowance: 0 }).batteryWh, 3090);
  assert.equal(p.requiredOutputW, 160);
});

test("heater flag: 1,500 W empties 1,000 Wh in 40 minutes", () => {
  const p = plan({ ...base, devices: [{ name: "Space heater", watts: 1500, hoursPerDay: 4 }] });
  assert.equal(p.devices[0].heavyLoad, true);
  assert.equal(Math.round(p.devices[0].minutesPer1000Wh!), 40);
});

test("label-only device is counted for energy and reported as missing watts", () => {
  const p = plan({ ...base, devices: [{ name: "Freezer", kwhPerYear: 300 }] });
  assert.deepEqual(p.devicesMissingWatts, ["Freezer"]);
  assert.equal(p.requiredOutputW, 0);
});

test("bad input never produces negatives or NaN", () => {
  const p = plan({ adults: -2, children: NaN, pets: -1, days: -3, climate: "mild", floors: -1, devices: [{ name: "x", watts: -5, hoursPerDay: 2 }] });
  assert.equal(p.waterGallons, 0);
  assert.equal(p.foodKcal, 0);
  assert.equal(p.batteryWh, 0);
  assert.equal(p.devices.length, 0);
});
