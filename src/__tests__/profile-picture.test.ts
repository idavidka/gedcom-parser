import GedcomTree from "..";

/**
 * Ancestry export: every INDI OBJE is a shared pointer. Primary photos have
 * empty FILE on the `0 @On@ OBJE` record. Some records include `_MSER._LKID`
 * (Láng Gusztáv); others only `_OID` (Mommer Hermina Angéla).
 */
const ANCESTRY_SHARED_OBJE = `0 HEAD
1 SOUR Ancestry.com Family Trees
2 NAME Ancestry.com Member Trees
2 _TREE Test Tree
3 RIN 88339524
2 CORP Ancestry.com
3 WWW www.ancestry.com
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Hermina Angéla /Mommer/
1 SEX F
1 OBJE @O1@
2 _PRIM Y
1 OBJE @O3@
0 @I2@ INDI
1 NAME Gusztáv /Láng/
1 SEX M
1 OBJE @O2@
2 _PRIM Y
1 OBJE @O3@
0 @O1@ OBJE
1 FILE
2 FORM jpg
3 TYPE image
2 TITL Mommer Hermina Angéla
1 _OID 8c467340-e92c-4814-bb1f-047320f6de36
0 @O2@ OBJE
1 FILE
2 FORM jpg
3 TYPE image
2 TITL Láng Gusztáv
1 _OID ae281b0b-c847-4256-9f27-6fe365ba55e0
1 _MSER
2 _LKID ae281b0b-c847-4256-9f27-6fe365ba55e0
0 @O3@ OBJE
1 FILE
2 FORM jpg
3 TYPE image
2 TITL Family portrait
1 NOTE Wedding, 1924
1 _OID 39edc6fb-21c0-41e5-aa28-15efc1ed1d46
0 TRLR`;

describe("Ancestry shared OBJE profile pictures", () => {
	it("resolves a primary photo that only has _OID (no _MSER._LKID)", async () => {
		const { gedcom } = GedcomTree.parse(ANCESTRY_SHARED_OBJE);
		const hermina = gedcom.indi("@I1@");
		const gustav = gedcom.indi("@I2@");

		const herminaPic = await hermina?.getProfilePicture(1093);
		const gustavPic = await gustav?.getProfilePicture(1093);

		expect(gustavPic?.file).toContain(
			"api/media/retrieval/v2/image/namespaces/1093/media/ae281b0b-c847-4256-9f27-6fe365ba55e0"
		);
		expect(herminaPic?.file).toContain(
			"api/media/retrieval/v2/image/namespaces/1093/media/8c467340-e92c-4814-bb1f-047320f6de36"
		);
		expect(herminaPic?.isPrimary).toBe(true);
	});

	it("writes FILE onto the shared OBJE record during export", () => {
		const { gedcom } = GedcomTree.parse(ANCESTRY_SHARED_OBJE);
		const exported = gedcom.toGedcom(undefined, 0, {
			original: true,
			obje: { standardize: true, namespace: 1093 },
		});

		expect(exported).toContain(
			"api/media/retrieval/v2/image/namespaces/1093/media/8c467340-e92c-4814-bb1f-047320f6de36"
		);
	});

	it("lists people who share a tagged photo", async () => {
		const { gedcom } = GedcomTree.parse(ANCESTRY_SHARED_OBJE);
		const hermina = gedcom.indi("@I1@");
		const media = await hermina?.multimedia(1093);
		const family = Object.values(media ?? {}).find(
			(item) => item.title === "Family portrait"
		);

		expect(family?.note).toBe("Wedding, 1924");
		expect(gedcom.indisLinkingObje("@O3@").map((person) => person.id)).toEqual(
			["@I1@", "@I2@"]
		);
	});
});

describe("Ancestry media URL hosts", () => {
	it("builds the retrieval API URL only", async () => {
		const { ancestryMediaFileUrl } = await import("../utils/media-utils");
		const url = ancestryMediaFileUrl(
			1093,
			"0dee7412-4f7f-4f0c-b21e-18edf598b07c"
		);
		expect(url).toBe(
			"https://www.ancestry.com/api/media/retrieval/v2/image/namespaces/1093/media/0dee7412-4f7f-4f0c-b21e-18edf598b07c?client=trees-mediaservice&imageQuality=hq"
		);
		expect(url).not.toContain("mediasvc.ancestry.com");
	});
});
