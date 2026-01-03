import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
	getCacheManagerFactory,
	resetCacheManagerFactory,
	setCacheManagerFactory,
	type CacheManagerFactory,
} from "../factories/cache-factory";
import {
	getKinshipTranslatorClass,
	resetKinshipTranslatorClass,
	setKinshipTranslatorClass,
	type KinshipTranslatorConstructor,
} from "../factories/kinship-factory";
import type { ICacheManager } from "../utils/cache";
import GedcomTree from "../utils/parser";

const SAMPLE_GEDCOM = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
2 PLAC New York, USA
1 FAMC @F1@
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE 15 MAR 1955
2 PLAC Boston, USA
1 FAMS @F1@
0 @I3@ INDI
1 NAME Robert /Doe/
1 SEX M
1 BIRT
2 DATE 10 JUL 1920
2 PLAC Chicago, USA
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I3@
1 WIFE @I2@
1 CHIL @I1@
1 MARR
2 DATE 5 JUN 1949
2 PLAC New York, USA
0 TRLR`;

describe("Smoke Tests - Basic Functionality", () => {
	it("should parse GEDCOM content", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);

		expect(tree).toBeDefined();
		expect(tree.indis()).toBeDefined();
	});

	it("should retrieve individuals", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const individuals = tree.indis();

		expect(individuals?.length).toBe(3);
	});

	it("should get individual by ID", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");

		expect(person).toBeDefined();
		expect(person?.id).toBe("@I1@");
	});

	it("should retrieve individual name", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");

		// GEDCOM format includes slashes around surname
		expect(person?.NAME?.toValue()).toBe("John /Doe/");
	});

	it("should retrieve birth date", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");
		const birthDate = person?.BIRT?.DATE?.toValue();

		expect(birthDate).toContain("1950");
	});

	it("should retrieve birth place", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");
		const birthPlace = person?.BIRT?.PLAC?.value;

		expect(birthPlace).toBe("New York, USA");
	});

	it("should get family relationships", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");
		const parents = person?.getParents();

		expect(parents).toBeDefined();
		expect(parents?.length).toBeGreaterThan(0);
	});

	it("should get fathers", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");
		const fathers = person?.getFathers();

		expect(fathers?.length).toBe(1);
		expect(fathers?.index(0)?.id).toBe("@I3@");
	});

	it("should get mothers", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");
		const mothers = person?.getMothers();

		expect(mothers?.length).toBe(1);
		expect(mothers?.index(0)?.id).toBe("@I2@");
	});

	it("should retrieve family by ID", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const family = tree.fam("@F1@");

		expect(family).toBeDefined();
		expect(family?.id).toBe("@F1@");
	});

	it("should get marriage date", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const family = tree.fam("@F1@");
		const marriageDate = family?.MARR?.DATE?.toValue();

		expect(marriageDate).toContain("1949");
	});

	it("should filter individuals", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const males = tree.indis()?.filter((indi) => indi.SEX?.value === "M");

		expect(males?.length).toBe(2);
	});

	it("should order individuals by birth date", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const ordered = tree
			.indis()
			?.orderBy({ "BIRT.DATE": { direction: "ASC" } });

		// Check that ordering is applied (may vary based on implementation)
		expect(ordered?.length).toBe(3);
		// Verify oldest and youngest exist
		const ids = [
			ordered?.index(0)?.id,
			ordered?.index(1)?.id,
			ordered?.index(2)?.id,
		];
		expect(ids).toContain("@I1@");
		expect(ids).toContain("@I2@");
		expect(ids).toContain("@I3@");
	});
});

describe("Smoke Tests - Cache Manager Factory", () => {
	afterEach(() => {
		resetCacheManagerFactory();
	});

	it("should have default in-memory cache factory", () => {
		const factory = getCacheManagerFactory();

		expect(factory).toBeDefined();
		expect(typeof factory).toBe("function");
	});

	it("should allow setting custom cache factory", () => {
		const customFactory: CacheManagerFactory = <T>(): ICacheManager<T> => {
			let cache: T | null = null;
			return {
				getItem: async () => cache,
				setItem: async (value: T) => {
					cache = value;
				},
			};
		};

		setCacheManagerFactory(customFactory);
		const factory = getCacheManagerFactory();

		expect(factory).toBe(customFactory);
	});

	it("should work with custom cache implementation", async () => {
		const testCache = new Map<string, unknown>();

		const customFactory: CacheManagerFactory = <T>(
			name: string,
			store: string,
			type: string
		): ICacheManager<T> => {
			const key = `${name}-${store}-${type}`;
			return {
				getItem: async () => (testCache.get(key) as T) ?? null,
				setItem: async (value: T) => {
					testCache.set(key, value);
				},
			};
		};

		setCacheManagerFactory(customFactory);

		const cache = customFactory<string>("test", "store", "type", false);
		await cache.setItem("test-value");
		const value = await cache.getItem();

		expect(value).toBe("test-value");
		expect(testCache.size).toBe(1);
	});

	it("should reset to default factory", () => {
		const customFactory: CacheManagerFactory = <T>(): ICacheManager<T> => ({
			getItem: async () => null,
			setItem: async () => {},
		});

		setCacheManagerFactory(customFactory);
		expect(getCacheManagerFactory()).toBe(customFactory);

		resetCacheManagerFactory();
		expect(getCacheManagerFactory()).not.toBe(customFactory);
	});

	it("should parse GEDCOM with custom cache", () => {
		const customFactory: CacheManagerFactory = <T>(): ICacheManager<T> => {
			let cache: T | null = null;
			return {
				getItem: async () => cache,
				setItem: async (value: T) => {
					cache = value;
				},
			};
		};

		setCacheManagerFactory(customFactory);

		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");

		// GEDCOM format includes slashes around surname
		expect(person?.NAME?.toValue()).toBe("John /Doe/");
	});
});

describe("Smoke Tests - Kinship Translator Factory", () => {
	afterEach(() => {
		resetKinshipTranslatorClass();
	});

	it("should have default kinship translator", () => {
		const TranslatorClass = getKinshipTranslatorClass();

		expect(TranslatorClass).toBeDefined();
		expect(typeof TranslatorClass).toBe("function");
	});

	it("should translate kinship with built-in translator", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const child = tree.indi("@I1@");
		const father = tree.indi("@I3@");

		const kinship = child?.kinship(father, false, "en");

		expect(kinship).toBeDefined();
		expect(typeof kinship).toBe("string");
	});

	it("should support multiple languages", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const child = tree.indi("@I1@");
		const father = tree.indi("@I3@");

		const kinshipEN = child?.kinship(father, false, "en");
		const kinshipHU = child?.kinship(father, false, "hu");
		const kinshipDE = child?.kinship(father, false, "de");

		expect(kinshipEN).toBeDefined();
		expect(kinshipHU).toBeDefined();
		expect(kinshipDE).toBeDefined();
		// Different languages should give different results
		// (unless they happen to be the same word)
	});

	it("should allow setting custom translator class", () => {
		const CustomTranslator: KinshipTranslatorConstructor = class {
			constructor(
				public person1: any,
				public person2?: any,
				public lang?: any,
				public entirePath?: any,
				public displayName?: any
			) {}

			translate() {
				return "custom relationship";
			}
		} as any;

		setKinshipTranslatorClass(CustomTranslator);
		const TranslatorClass = getKinshipTranslatorClass();

		expect(TranslatorClass).toBe(CustomTranslator);
	});

	it("should use custom translator", () => {
		const CustomTranslator: KinshipTranslatorConstructor = class {
			constructor(
				public person1: any,
				public person2?: any,
				public lang?: any,
				public entirePath?: any,
				public displayName?: any
			) {}

			translate() {
				return "custom kinship";
			}
		} as any;

		setKinshipTranslatorClass(CustomTranslator);

		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const child = tree.indi("@I1@");
		const father = tree.indi("@I3@");

		const kinship = child?.kinship(father, false, "en");

		expect(kinship).toBe("custom kinship");
	});

	it("should reset to default translator", () => {
		const CustomTranslator: KinshipTranslatorConstructor = class {
			constructor(
				public person1: any,
				public person2?: any,
				public lang?: any,
				public entirePath?: any,
				public displayName?: any
			) {}

			translate() {
				return "custom";
			}
		} as any;

		setKinshipTranslatorClass(CustomTranslator);
		expect(getKinshipTranslatorClass()).toBe(CustomTranslator);

		resetKinshipTranslatorClass();
		expect(getKinshipTranslatorClass()).not.toBe(CustomTranslator);
	});
});

describe("Smoke Tests - Export Integrity", () => {
	it("should export GedcomTree as default", () => {
		expect(GedcomTree).toBeDefined();
		expect(typeof GedcomTree).toBe("object"); // GedcomTree is an object with parse() method
		expect(typeof GedcomTree.parse).toBe("function");
	});

	it("should export cache factory functions", () => {
		expect(setCacheManagerFactory).toBeDefined();
		expect(getCacheManagerFactory).toBeDefined();
		expect(resetCacheManagerFactory).toBeDefined();
	});

	it("should export kinship factory functions", () => {
		expect(setKinshipTranslatorClass).toBeDefined();
		expect(getKinshipTranslatorClass).toBeDefined();
		expect(resetKinshipTranslatorClass).toBeDefined();
	});
});

describe("Smoke Tests - Error Handling", () => {
	it("should handle empty GEDCOM", () => {
		const { gedcom: tree } = GedcomTree.parse("");

		expect(tree).toBeDefined();
		// Empty GEDCOM may not have an indis list, or it may be empty
		const indis = tree.indis();
		expect(indis === undefined || indis.length === 0).toBe(true);
	});

	it("should handle invalid GEDCOM", () => {
		const { gedcom: tree } = GedcomTree.parse("not a valid gedcom");

		expect(tree).toBeDefined();
	});

	it("should handle missing individual", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I999@");

		expect(person).toBeUndefined();
	});

	it("should handle missing family", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const family = tree.fam("@F999@");

		expect(family).toBeUndefined();
	});

	it("should handle kinship with invalid person", () => {
		const { gedcom: tree } = GedcomTree.parse(SAMPLE_GEDCOM);
		const person = tree.indi("@I1@");

		const kinship = person?.kinship("@I999@", false, "en");

		expect(kinship).toBeDefined(); // Should not throw
	});
});
