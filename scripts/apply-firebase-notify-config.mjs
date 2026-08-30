/**
 * Apply Firebase web config into notify-web public files.
 *
 * Usage:
 *   node scripts/apply-firebase-notify-config.mjs path/to/config.json
 *
 * config.json shape:
 * {
 *   "apiKey": "...",
 *   "authDomain": "...",
 *   "projectId": "...",
 *   "storageBucket": "...",
 *   "messagingSenderId": "...",
 *   "appId": "...",
 *   "vapidKey": "...",
 *   "plantasUrl": "http://149.50.156.136/plantas"
 * }
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const input = process.argv[2];
if (!input) {
  console.error("Pass a config JSON path");
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(resolve(input), "utf8"));
const required = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
  "vapidKey",
];
for (const key of required) {
  if (!cfg[key]) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

const plantasUrl = cfg.plantasUrl || "http://149.50.156.136/plantas";

const moduleSource = `export const firebaseConfig = {
  apiKey: ${JSON.stringify(cfg.apiKey)},
  authDomain: ${JSON.stringify(cfg.authDomain)},
  projectId: ${JSON.stringify(cfg.projectId)},
  storageBucket: ${JSON.stringify(cfg.storageBucket)},
  messagingSenderId: ${JSON.stringify(cfg.messagingSenderId)},
  appId: ${JSON.stringify(cfg.appId)},
};

export const vapidKey = ${JSON.stringify(cfg.vapidKey)};

export const plantasUrl = ${JSON.stringify(plantasUrl)};
`;

const swPath = resolve("notify-web/public/firebase-messaging-sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(
  /const firebaseConfig = \{[\s\S]*?\};/,
  `const firebaseConfig = {
  apiKey: ${JSON.stringify(cfg.apiKey)},
  authDomain: ${JSON.stringify(cfg.authDomain)},
  projectId: ${JSON.stringify(cfg.projectId)},
  storageBucket: ${JSON.stringify(cfg.storageBucket)},
  messagingSenderId: ${JSON.stringify(cfg.messagingSenderId)},
  appId: ${JSON.stringify(cfg.appId)},
};`,
);

writeFileSync(resolve("notify-web/public/firebase-config.js"), moduleSource);
writeFileSync(swPath, sw);

const firebaserc = {
  projects: {
    default: cfg.projectId,
  },
};
writeFileSync(
  resolve("notify-web/.firebaserc"),
  `${JSON.stringify(firebaserc, null, 2)}\n`,
);

console.log("Updated notify-web config for project", cfg.projectId);
