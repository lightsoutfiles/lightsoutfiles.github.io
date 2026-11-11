// Settings to fill in at deploy time.
var CONFIG = {
  kitListUrl: "https://lights-out-files.kit.com/0402845ee1",
  // Kit form endpoint that receives the email. Needs one live test after deploy.
  kitSubscribeUrl: "https://app.kit.com/forms/10169713/subscriptions",
  // Google Analytics 4 Measurement ID, e.g. "G-XXXXXXXXXX". Empty = events are only kept on the page.
  ga4Id: "G-GGTFLV1P5N"
};

// Source tag: calculator links carry ?src=yt-s01 and so on. Letters, digits, dash and underscore only.
var SOURCE = (function () {
  try {
    var q = new URLSearchParams(location.search);
    var v = (q.get("src") || q.get("utm_campaign") || "direct").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    return v || "direct";
  } catch (e) { return "direct"; }
})();

var TRACK_LOG = [];
var TRACK_ONCE = {};
(function () {
  if (!CONFIG.ga4Id) return;
  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.ga4Id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", CONFIG.ga4Id);
})();
// Each event fires once per visit, tagged with the source.
function track(name) {
  if (TRACK_ONCE[name]) return;
  TRACK_ONCE[name] = 1;
  TRACK_LOG.push({ event: name, source: SOURCE });
  if (window.gtag) window.gtag("event", name, { source: SOURCE });
}

function subscribe(email) {
  if (!CONFIG.kitSubscribeUrl) return;
  try {
    var fd = new FormData();
    fd.append("email_address", email);
    fd.append("fields[source]", SOURCE);
    fetch(CONFIG.kitSubscribeUrl, { method: "POST", mode: "no-cors", body: fd }).catch(function () {});
  } catch (e) {}
}

// Two-page plan PDF. No product or affiliate links, by design.
function makePlanPdf(h, p) {
  if (!window.jspdf || !window.jspdf.jsPDF) return false;
  var doc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
  var W = 612, M = 48, y = 0;
  var n = function (v) { return Math.round(v).toLocaleString("en-US"); };
  function band(title, sub) {
    doc.setFillColor(2, 7, 19); doc.rect(0, 0, W, 96, "F");
    doc.setTextColor(255, 166, 48); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("LIGHTS OUT FILES", M, 34);
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(title, M, 62);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(200, 205, 215);
    doc.text(sub, M, 80);
    y = 126;
  }
  function head(t) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(180, 105, 0);
    doc.text(t.toUpperCase(), M, y); y += 8;
    doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 18;
  }
  function para(t, size) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size || 11); doc.setTextColor(30, 33, 38);
    var lines = doc.splitTextToSize(t, W - 2 * M);
    doc.text(lines, M, y); y += lines.length * ((size || 11) + 4) + 4;
  }
  function check(t) {
    doc.setDrawColor(180, 105, 0); doc.setLineWidth(1.2); doc.rect(M, y - 9, 10, 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(30, 33, 38);
    var lines = doc.splitTextToSize(t, W - 2 * M - 22);
    doc.text(lines, M + 20, y); y += lines.length * 15 + 6;
  }
  function row(k, v) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(90, 96, 110); doc.text(k, M, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 33, 38); doc.text(v, 250, y); y += 18;
  }

  band("Your " + h.days + "-day outage plan", p.people + " people, " + Math.floor(h.pets || 0) + " pets, " + h.days + " days" + (p.hotClimateDoubled ? ", very hot climate" : ""));
  head("Your numbers");
  row("Water", n(p.waterGallons) + " gallons (" + n(p.waterGallons * 3.785) + " litres)" + (p.hotClimateDoubled ? ", doubled for heat" : ""));
  row("Food", n(p.foodKcal) + " calories (" + n(p.foodKcalPerDay) + " a day)");
  row("CO detectors", n(p.coDetectorsMin) + " minimum, plus one near each sleeping area");
  if (p.batteryWh > 0) {
    row("Power station", n(p.batteryWh) + " Wh (" + n(p.dailyWh) + " Wh a day)");
    if (p.requiredOutputW > 0) row("Output needed", n(p.requiredOutputW) + " W if everything runs at once");
  }
  y += 10;
  head("What to get");
  check(n(p.waterGallons) + " gallons of stored water in food-grade containers");
  check("Non-perishable, no-cook food totalling about " + n(p.foodKcal) + " calories, plus a manual can opener");
  check(n(p.coDetectorsMin) + " battery-backup carbon monoxide detector" + (p.coDetectorsMin === 1 ? "" : "s") + ", plus one near each sleeping area");
  if (p.batteryWh > 0) check("A power station of at least " + n(p.batteryWh) + " Wh" + (p.requiredOutputW > 0 ? " with " + n(p.requiredOutputW) + " W or more of output" : ""));
  check("Battery or hand-crank radio, and a NOAA Weather Radio with tone alert");
  check("Flashlight or lantern with spare batteries. Use battery lights instead of candles.");
  check("Phone chargers and a backup battery, charged before the outage");
  check("Cash, and copies of key documents in a waterproof container");
  if (p.devices.length) {
    y += 10; head("Your devices");
    p.devices.forEach(function (d) {
      row(String(d.name).slice(0, 34), n(d.dailyWh) + " Wh a day" + (d.watts ? ", " + n(d.watts) + " W" : ""));
    });
    p.devices.filter(function (d) { return d.heavyLoad; }).forEach(function (d) {
      para("Heavy load: " + d.name + " at " + n(d.watts) + " W empties a 1,000 Wh power station in about " + n(d.minutesPer1000Wh) + " minutes.", 10);
    });
  }

  doc.addPage();
  band("When the power goes out", "Keep this page where you can find it in the dark.");
  head("Food safety");
  check("Keep fridge and freezer doors closed.");
  check("A closed fridge keeps food safe for about 4 hours.");
  check("A full freezer holds its temperature for about 48 hours, a half-full freezer about 24 hours.");
  y += 10; head("Carbon monoxide");
  check("Run a generator outdoors only, more than 20 feet from windows, doors and vents. Never in a home or garage.");
  check("Never heat your home with a gas stove, oven or grill.");
  check("If a CO alarm sounds or anyone feels dizzy, sick or has a headache, get everyone into fresh air and call your local emergency number.");
  y += 10; head("Staying informed and connected");
  check("Use the radio for official updates when the internet is down.");
  check("Save phone battery: lower the brightness and close apps you do not need.");
  check("Check on neighbours who are older or live alone.");
  y += 10; head("Keeping this plan current");
  check("Replace stored tap water every 6 months.");
  check("Review stored food once a year.");
  check("Test CO detector batteries when you change your clocks, and replace the unit every 5 years or as the maker says.");
  y += 14;
  para("Free kit list and printable checklist: lights-out-files.kit.com/0402845ee1", 11);
  para("A planning aid based on ready.gov and CDC guidance. It is not medical advice. Check your device labels and your local emergency guidance. Sources: ready.gov/kit, ready.gov/power-outages, cdc.gov.", 9);
  try { doc.save("lights-out-files-" + h.days + "-day-plan.pdf"); return true; } catch (e) { return false; }
}
