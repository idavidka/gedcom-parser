import GedcomTree from './dist/utils/parser.js';
import { mergeGedcoms } from './dist/classes/gedcom.js';
import { readFileSync } from 'fs';

const mergeSource = readFileSync('src/__tests__/mocks/merge-source.ged', 'utf-8');
const mergeTarget = readFileSync('src/__tests__/mocks/merge-target.ged', 'utf-8');

const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

console.log("=== SOURCE GEDCOM ===");
sourceGedcom.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()}`);
});

console.log("\n=== TARGET GEDCOM ===");
targetGedcom.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()}`);
});

console.log("\n=== MERGED WITH ID STRATEGY ===");
const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");
merged.indis()?.forEach(indi => {
  console.log(`${indi.id}: ${indi.NAME?.toString()}`);
});

console.log(`\nTotal individuals in merged: ${merged.indis()?.length}`);
