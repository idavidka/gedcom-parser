import GedcomTree from './dist/utils/parser.js';
import { mergeGedcoms } from './dist/classes/gedcom.js';

// Create test GEDCOM 1 - all individuals have _FS_ID
const gedcom1String = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I11@ INDI
1 FAMC @F16@
1 FAMS @F6@
1 _FS_ID GPG3-8CH
1 NAME Lukács /Ozsvár/
1 SEX M
1 BIRT
2 DATE 03 Sep 1899
1 DEAT
2 DATE 22 Dec 1960
0 @I12@ INDI
1 _FS_ID WIFE-001
1 NAME Wife /One/
1 SEX F
0 @I13@ INDI
1 _FS_ID CHILD-001
1 NAME Child /One/
1 FAMC @F6@
0 @F6@ FAM
1 HUSB @I11@
1 WIFE @I12@
1 CHIL @I13@
0 @F16@ FAM
1 CHIL @I11@
0 TRLR`;

// Create test GEDCOM 2 - same people with _FS_ID, different IDs
const gedcom2String = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 FAMC @F9@
1 FAMS @F1@
1 _FS_ID GPG3-8CH
1 NAME Lukács /Ozsvár/
1 SEX M
1 BIRT
2 DATE 03 Sep 1899
1 DEAT
2 DATE 22 Dec 1960
0 @I2@ INDI
1 _FS_ID WIFE-001
1 NAME Wife /One/
1 SEX F
0 @I3@ INDI
1 _FS_ID CHILD-002
1 NAME Child /Two/
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 @F9@ FAM
1 CHIL @I1@
0 TRLR`;

const { gedcom: gedcom1 } = GedcomTree.parse(gedcom1String);
const { gedcom: gedcom2 } = GedcomTree.parse(gedcom2String);

console.log("=== BEFORE MERGE ===");
console.log("\nGEDCOM 1:");
gedcom1.indis()?.forEach(indi => {
  console.log(`  ${indi.id}: ${indi.NAME?.toString()} (_FS_ID: ${indi._FS_ID?.toString()})`);
});
console.log("  Families:", gedcom1.fams()?.length);

console.log("\nGEDCOM 2:");
gedcom2.indis()?.forEach(indi => {
  console.log(`  ${indi.id}: ${indi.NAME?.toString()} (_FS_ID: ${indi._FS_ID?.toString()})`);
});
console.log("  Families:", gedcom2.fams()?.length);

// Merge using _FS_ID as matching strategy
const merged = mergeGedcoms(gedcom1, gedcom2, "_FS_ID");

console.log("\n=== AFTER MERGE ===");
console.log("\nMerged individuals:");
merged.indis()?.forEach(indi => {
  const fams = indi.FAMS?.toList()?.map(f => f.value) || [];
  const famc = indi.FAMC?.toList()?.map(f => f.value) || [];
  console.log(`  ${indi.id}: ${indi.NAME?.toString()}`);
  console.log(`    _FS_ID: ${indi._FS_ID?.toString()}`);
  console.log(`    FAMS: ${JSON.stringify(fams)}`);
  console.log(`    FAMC: ${JSON.stringify(famc)}`);
});

console.log("\nTotal families in merged:", merged.fams()?.length);
console.log("Total individuals in merged:", merged.indis()?.length);

// Check expectations
const lukacs = merged.indi("@I11@");
const wife = merged.indi("@I12@");
const famsRefs = lukacs?.FAMS?.toList();
const famcRefs = lukacs?.FAMC?.toList();

console.log("\n=== ANALYSIS ===");
console.log("Lukács FAMS count:", famsRefs?.length, "(expected: 1, since both families have same husband+wife)");
console.log("Lukács FAMC count:", famcRefs?.length, "(expected: 1, since both families have same child)");
console.log("Wife matched:", wife?._FS_ID?.toString() === "WIFE-001" ? "YES" : "NO");

// Show family details
console.log("\n=== FAMILY DETAILS ===");
merged.fams()?.forEach(fam => {
  const husbId = fam.HUSB?.value;
  const wifeId = fam.WIFE?.value;
  const husbName = husbId ? merged.indi(husbId)?.NAME?.toString() : "N/A";
  const wifeName = wifeId ? merged.indi(wifeId)?.NAME?.toString() : "N/A";
  
  console.log(`Family ${fam.id}:`);
  console.log(`  HUSB: ${husbId} (${husbName})`);
  console.log(`  WIFE: ${wifeId} (${wifeName})`);
  
  const children = fam.CHIL?.toList()?.map(c => {
    const childId = c.value;
    const childName = merged.indi(childId)?.NAME?.toString();
    return `${childId} (${childName})`;
  });
  console.log("  CHIL:", children || []);
});

if (famsRefs?.length === 1 && famcRefs?.length === 1) {
  console.log("\n✅ SUCCESS: Families were properly merged!");
} else {
  console.log("\n❌ ISSUE: Families were NOT properly merged");
}
