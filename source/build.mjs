import fs from "node:fs";
const js = fs.readFileSync("build/supply.inline.js","utf8");
const ex = fs.readFileSync("src/extras.js","utf8");
const page = fs.readFileSync("src/page.template.html","utf8").replace("/*__SUPPLY__*/", () => js).replace("/*__EXTRAS__*/", () => ex);
fs.writeFileSync("emergency-supply-calculator.html", page);
fs.mkdirSync("site", { recursive: true });
const m = page.match(/^<title>.*<\/title>\n<meta[^>]*>\n/);
fs.writeFileSync("site/index.html", `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Free emergency supply calculator: water, food, power and CO detector numbers for your household, based on ready.gov and CDC guidance.">
<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
</head><body>
${page}
</body></html>`);
