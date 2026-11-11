// Lights Out Files — Emergency Supply Calculator formulas.
// One module so the page, the PDF and our scripts all use the same logic.
// Sources: ready.gov/kit (1 gal/person/day), Ready Houston (1 gal/pet/day),
// Suffolk County OEM (needs can double in very hot weather),
// ready.gov/power-outages (CO detectors, fridge 4 h, freezer 48 h / 24 h),
// Virginia Tech Extension and Dept. of Energy (watts x hours; kWh/yr / 365).

export type Climate = "cold" | "mild" | "hot";

export interface Device {
  name: string;
  /** Running watts. Optional when kwhPerYear is given. */
  watts?: number;
  /** Hours used per day. Ignored when kwhPerYear is given. */
  hoursPerDay?: number;
  /** Energy Guide label figure, for fridges and freezers. */
  kwhPerYear?: number;
}

export interface Household {
  adults: number;
  children: number;
  pets: number;
  days: number;
  climate: Climate;
  floors: number;
  devices: Device[];
  /** Assumption, editable. Default 2000. */
  kcalPerPersonPerDay?: number;
  /** Assumption, editable. Default 0.15. */
  lossAllowance?: number;
}

export interface DeviceResult {
  name: string;
  dailyWh: number;
  watts: number | null;
  /** Minutes a 1,000 Wh power station lasts on this device alone. Set for heavy loads. */
  minutesPer1000Wh: number | null;
  heavyLoad: boolean;
}

export interface Plan {
  people: number;
  waterGallons: number;
  waterGallonsPerDay: number;
  hotClimateDoubled: boolean;
  foodKcal: number;
  foodKcalPerDay: number;
  coDetectorsMin: number;
  fridgeHours: number;
  freezerFullHours: number;
  freezerHalfHours: number;
  devices: DeviceResult[];
  dailyWh: number;
  batteryWh: number;
  requiredOutputW: number;
  devicesMissingWatts: string[];
}

export const DEFAULT_KCAL = 2000;
export const DEFAULT_LOSS = 0.15;
export const HEAVY_LOAD_W = 1000;

function nonNeg(n: number | undefined, fallback = 0): number {
  return typeof n === "number" && isFinite(n) && n > 0 ? n : fallback;
}

export function deviceDailyWh(d: Device): number {
  const kwh = nonNeg(d.kwhPerYear);
  if (kwh > 0) return (kwh / 365) * 1000;
  return nonNeg(d.watts) * Math.min(nonNeg(d.hoursPerDay), 24);
}

export function plan(h: Household): Plan {
  const adults = Math.floor(nonNeg(h.adults));
  const children = Math.floor(nonNeg(h.children));
  const pets = Math.floor(nonNeg(h.pets));
  const days = Math.floor(nonNeg(h.days));
  const floors = Math.max(1, Math.floor(nonNeg(h.floors, 1)));
  const people = adults + children;
  const kcal = nonNeg(h.kcalPerPersonPerDay, DEFAULT_KCAL);
  const loss =
    typeof h.lossAllowance === "number" && isFinite(h.lossAllowance) && h.lossAllowance >= 0
      ? h.lossAllowance
      : DEFAULT_LOSS;

  const hot = h.climate === "hot";
  const waterPerDay = (people + pets) * 1 * (hot ? 2 : 1);

  const devices: DeviceResult[] = [];
  const missing: string[] = [];
  let dailyWh = 0;
  let outputW = 0;
  for (const d of h.devices || []) {
    const wh = deviceDailyWh(d);
    const w = nonNeg(d.watts);
    if (wh <= 0 && w <= 0) continue;
    const heavy = w >= HEAVY_LOAD_W;
    devices.push({
      name: d.name || "Device",
      dailyWh: wh,
      watts: w > 0 ? w : null,
      minutesPer1000Wh: heavy ? (1000 / w) * 60 : null,
      heavyLoad: heavy,
    });
    dailyWh += wh;
    outputW += w;
    if (w <= 0) missing.push(d.name || "Device");
  }

  return {
    people,
    waterGallons: waterPerDay * days,
    waterGallonsPerDay: waterPerDay,
    hotClimateDoubled: hot,
    foodKcal: people * days * kcal,
    foodKcalPerDay: people * kcal,
    coDetectorsMin: floors,
    fridgeHours: 4,
    freezerFullHours: 48,
    freezerHalfHours: 24,
    devices,
    dailyWh,
    batteryWh: dailyWh * days * (1 + loss),
    requiredOutputW: outputW,
    devicesMissingWatts: missing,
  };
}
