#!/usr/bin/env node
/**
 * Valida el título de una demo generada por el skill demostracion.
 * Uso: node scripts/validate-demo.js "Mi título"
 */

const title = process.argv[2];

if (!title || !title.trim()) {
  console.error("ERROR: falta el título. Uso: node scripts/validate-demo.js \"Mi título\"");
  process.exit(1);
}

const trimmed = title.trim();

if (trimmed.length < 3) {
  console.error(`ERROR: título demasiado corto (${trimmed.length} chars, mínimo 3)`);
  process.exit(1);
}

if (trimmed.length > 80) {
  console.error(`ERROR: título demasiado largo (${trimmed.length} chars, máximo 80)`);
  process.exit(1);
}

console.log(`OK: título válido ("${trimmed}")`);
