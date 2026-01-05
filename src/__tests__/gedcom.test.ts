import { createGedCom, GedCom } from "../classes";
import GedcomTree from "..";
import { textFileLoader, maybeUpdateSnapshot } from "./test-utils";

import toJsonSnapshotResponse from "./mocks/mock-export-json.json";

const toGedcomSnapshotResponse = textFileLoader(
  "src/__tests__/mocks/mock-export-gedcom.ged"
);
const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("GEDCOM Class Functionality", () => {
  const { gedcom: testGedcom } = GedcomTree.parse(mock);

  describe("GEDCOM Object Creation", () => {
    it("should return with a new Gedcom", () => {
      const common = createGedCom();

      expect(common).toBeInstanceOf(GedCom);
    });
  });

  describe("Export Functionality", () => {
    it("toGedcom should match", () => {
      const gedcomString = testGedcom.toGedcom(undefined, undefined, {
        original: true,
      });

      maybeUpdateSnapshot("mock-export-gedcom.ged", gedcomString);
      expect(gedcomString).toEqual(toGedcomSnapshotResponse);
    });

    it("toJson should match", () => {
      const jsonString = JSON.parse(testGedcom.toJson());

      maybeUpdateSnapshot("mock-export-json.json", jsonString);
      expect(jsonString).toMatchObject(toJsonSnapshotResponse);
    });
  });
});
