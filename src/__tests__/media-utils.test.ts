import { describe, expect, it } from "vitest";

import {
	getFileExtension,
	isImageFormat,
} from "../utils/media-utils";

describe("media-utils", () => {
	it("detects image types from data URLs", () => {
		expect(getFileExtension("data:image/jpeg;base64,/9j/")).toBe("jpg");
		expect(getFileExtension("data:image/png;base64,iVBOR")).toBe("png");
		expect(isImageFormat("data:image/jpeg;base64,/9j/")).toBe(true);
		expect(isImageFormat("raw")).toBe(false);
		expect(isImageFormat("image/png")).toBe(true);
	});
});
