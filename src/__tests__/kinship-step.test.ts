import { readFileSync } from "node:fs";
import GedcomTree from "..";
import type { IndiKey, IndiType } from "../types/types";
import { pathCache } from "../utils/cache";

// Scenario (see mocks/mock-step.ged):
//
//        GrandFather + GrandMother
//           |                    |
//    Mary Mother            Wendy Aunt
//      |           \          /
// Bio Father    Step Father +
//      |           |             |
//      +---- Anchor (step)    Theo Cousin
//                  |
//            (bio via F2)    Half Sister (child of StepFather + Mary)
//
// Anchor is the stepchild of StepFather (_FREL step) but also the
// biological child of Bio Father. Theo is the biological child of
// Step Father and Wendy (Mary's sister), so Theo is both
//  - reachable in 2 hops via the step father (old, buggy label:
//    "step half-brother" / "mostoha féltestvér") and
//  - a blood first cousin in 4 hops (expected: "1st cousin" / "unokatestvér").
// Wendy is both the step father's wife (2 hops) and the blood aunt (3 hops).
// A blood path must always win over a non-biological one.

const raw = readFileSync(`${__dirname}/mocks/mock-step.ged`, "utf8");

const { gedcom } = GedcomTree.parse(raw);

const indi = (id: number): IndiType | undefined =>
    gedcom.indi(`@I${id}@` as IndiKey);

const anchor = indi(1);

describe("kinship: biological path preferred over step path", () => {
    it("keeps direct labels for both fathers", () => {
        expect(anchor?.kinship(indi(4))).toEqual("father");
        expect(anchor?.kinship(indi(4), false, "hu")).toEqual("apa");
        expect(anchor?.kinship(indi(4), false, "ru")).toEqual("отец");
        expect(anchor?.kinship(indi(2))).toEqual("step father");
        expect(anchor?.kinship(indi(2), false, "hu")).toEqual("mostoha apa");
    });

    it("recognizes a half-sibling sharing one blood parent", () => {
        expect(anchor?.kinship(indi(5))).toEqual("half-sister");
        expect(anchor?.kinship(indi(5), false, "hu")).toEqual("féltestvér");
        expect(anchor?.kinship(indi(5), false, "de")).toEqual("Halbschwester");
        expect(anchor?.kinship(indi(5), false, "fr")).toEqual("demi-sœur");
        expect(anchor?.kinship(indi(5), false, "es")).toEqual("media hermana");
    });

    it("prefers the blood cousin over the shorter step half-brother path", () => {
        expect(anchor?.kinship(indi(9))).toEqual("cousin");
        expect(anchor?.kinship(indi(9), false, "hu")).toEqual("unokatestvér");
    });

    it("prefers the blood aunt over the shorter step-father's-wife path", () => {
        expect(anchor?.kinship(indi(8))).toEqual("aunt");
        expect(anchor?.kinship(indi(8), false, "hu")).toEqual("nagynéni");
    });

    it("keeps step labels where no blood path exists", () => {
        expect(anchor?.kinship(indi(10))).toEqual("step grandfather");
        expect(anchor?.kinship(indi(10), false, "hu")).toEqual(
            "mostoha nagyapa"
        );
        expect(anchor?.kinship(indi(11))).toEqual("step grandmother");
        expect(anchor?.kinship(indi(11), false, "hu")).toEqual(
            "mostoha nagyanya"
        );
    });
});

describe("kinship: half-blood collaterals inherit the half prefix", () => {
    it("labels the half-sibling's child as a half-niece", () => {
        expect(anchor?.kinship(indi(12))).toEqual("half-niece");
        expect(anchor?.kinship(indi(12), false, "hu")).toEqual("félunokahúg");
        expect(indi(12)?.kinship(anchor)).toEqual("half-aunt");
        expect(indi(12)?.kinship(anchor, false, "hu")).toEqual("félnagynéni");
    });

    it("labels the child of a half-sibling as a half-aunt of the next generation", () => {
        expect(indi(14)?.kinship(indi(5))).toEqual("half-aunt");
        expect(indi(14)?.kinship(indi(5), false, "hu")).toEqual("félnagynéni");
        expect(indi(14)?.kinship(indi(5), false, "es")).toEqual("media tía");
        expect(indi(5)?.kinship(indi(14))).toEqual("half-nephew");
        expect(indi(5)?.kinship(indi(14), false, "hu")).toEqual("félunokaöcs");
        expect(indi(5)?.kinship(indi(14), false, "es")).toEqual("medio sobrino");
    });

    it("labels children of half-siblings as half-cousins", () => {
        expect(indi(14)?.kinship(indi(12))).toEqual("half-cousin");
        expect(indi(14)?.kinship(indi(12), false, "hu")).toEqual(
            "félunokatestvér"
        );
    });

    it("labels grandchildren of half-siblings as half-second-cousins", () => {
        expect(indi(15)?.kinship(indi(13))).toEqual("half 2nd cousin");
        expect(indi(15)?.kinship(indi(13), false, "hu")).toEqual(
            "fél-másodunokatestvér"
        );
        expect(indi(15)?.kinship(indi(13), false, "de")).toEqual(
            "Halb-Cousin 2. Grades"
        );
        expect(indi(15)?.kinship(indi(13), false, "fr")).toEqual(
            "demi-cousin au 2nd degré"
        );
        expect(indi(15)?.kinship(indi(5))).toEqual("half-grandaunt");
        expect(indi(15)?.kinship(indi(5), false, "hu")).toEqual(
            "fél-nagy-nagynéni"
        );
        expect(indi(15)?.kinship(indi(5), false, "de")).toEqual(
            "Halb-Großtante"
        );
        expect(indi(15)?.kinship(indi(5), false, "fr")).toEqual(
            "demi-grand-tante"
        );
    });

    it("keeps the fél prefix in the possessed Hungarian form", () => {
        expect(indi(14)?.kinship(indi(5), true, "hu")).toEqual(
            "Carl félnagynénje"
        );
        expect(indi(15)?.kinship(indi(13), true, "hu")).toEqual(
            "Gino fél-másodunokatestvére"
        );
    });

    it("does not mark full-blood collaterals as half", () => {
        expect(anchor?.kinship(indi(8))).toEqual("aunt");
        expect(anchor?.kinship(indi(8), false, "hu")).toEqual("nagynéni");
        expect(anchor?.kinship(indi(9))).toEqual("cousin");
        expect(anchor?.kinship(indi(9), false, "hu")).toEqual("unokatestvér");
    });
});

describe("kinship: discovered paths fill the cache for every pair on the route", () => {
    const { gedcom: cachedGedcom } = GedcomTree.parse(raw);
    const { gedcom: freshGedcom } = GedcomTree.parse(raw);

    const person = (tree: typeof cachedGedcom, id: number) =>
        tree.indi(`@I${id}@` as IndiKey);

    it("stores every intermediate pair and its reverse after one search", () => {
        const from = person(cachedGedcom, 15);
        const to = person(cachedGedcom, 13);
        const full = from?.path(to);
        expect(full?.length).toBeGreaterThan(3);

        for (let i = 0; i < (full?.length ?? 0); i++) {
            for (let j = i + 1; j < (full?.length ?? 0); j++) {
                const a = full![i].indi.id as IndiKey;
                const b = full![j].indi.id as IndiKey;
                const forward = pathCache(cachedGedcom, `${a}|${b}`);
                const reverse = pathCache(cachedGedcom, `${b}|${a}`);

                expect(forward, `${a} -> ${b}`).toBeDefined();
                expect(reverse, `${b} -> ${a}`).toBeDefined();
                expect(forward![0].indi.id).toBe(a);
                expect(forward![0].kinship).toBe("self");
                expect(forward![0].level).toBe(0);
                expect(forward![forward!.length - 1].indi.id).toBe(b);
                expect(reverse![0].indi.id).toBe(b);
                expect(reverse![0].kinship).toBe("self");
                expect(reverse![0].level).toBe(0);
                expect(reverse![reverse!.length - 1].indi.id).toBe(a);
            }
        }
    });

    it("reuses the cached subpath so kinship matches a fresh BFS", () => {
        person(cachedGedcom, 15)?.path(person(cachedGedcom, 13));

        const cachedFrom = person(cachedGedcom, 14);
        const cachedTo = person(cachedGedcom, 12);
        const cachedPath = cachedFrom?.path(cachedTo);

        expect(cachedPath).toBe(
            pathCache(
                cachedGedcom,
                `${cachedFrom?.id}|${cachedTo?.id}` as `${IndiKey}|${IndiKey}`
            )
        );

        const freshFrom = person(freshGedcom, 14);
        const freshTo = person(freshGedcom, 12);
        expect(cachedFrom?.kinship(cachedTo)).toEqual(
            freshFrom?.kinship(freshTo)
        );
        expect(cachedFrom?.kinship(cachedTo, false, "hu")).toEqual(
            freshFrom?.kinship(freshTo, false, "hu")
        );
        expect(cachedTo?.kinship(cachedFrom)).toEqual(
            freshTo?.kinship(freshFrom)
        );
    });
});
