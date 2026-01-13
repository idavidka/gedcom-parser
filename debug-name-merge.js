import GedcomTree from './dist/utils/parser.js';
import { mergeGedcoms } from './dist/classes/gedcom.js';
import { readFileSync } from 'fs';

const mergeSource = readFileSync('src/__tests__/mocks/merge-source.ged', 'utf-8');
const mergeTarget = readFileSync('src/__tests__/mocks/merge-target.ged', 'utf-8');

const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

console.log("=== SOURCE GEDCOM ===");
sourceGedcom.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()} (raw: ${JSON.stringify(indi.NAME?.value)})`);
});

console.log("\n=== TARGET GEDCOM ===");
targetGedcom.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()} (raw: ${JSON.stringify(indi.NAME?.value)})`);
});

console.log("\n=== MERGED WITH NAME STRATEGY ===");
const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "NAME");
merged.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()}`);
});

console.log(`\nTotal individuals in merged: ${merged.indis()?.length}`);
