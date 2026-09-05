/**
 * GEDCOM 7 record metadata: UID, CREA, CHAN.
 */

import type { Common } from "../classes/common";
import { createCommon } from "../classes/common";
import { createCommonDate } from "../classes/date";
import type { GedComType } from "../classes/gedcom";
import { createGedcomUid } from "./uid";

type RestoreFn = () => void;

const GEDCOM_MONTHS = [
	"JAN",
	"FEB",
	"MAR",
	"APR",
	"MAY",
	"JUN",
	"JUL",
	"AUG",
	"SEP",
	"OCT",
	"NOV",
	"DEC",
] as const;

/** Format an instant as GEDCOM 7 DATE + optional TIME payloads. */
export const formatGedcom7Timestamp = (date = new Date()) => {
	const day = String(date.getUTCDate());
	const month = GEDCOM_MONTHS[date.getUTCMonth()];
	const year = String(date.getUTCFullYear());
	const hh = String(date.getUTCHours()).padStart(2, "0");
	const mm = String(date.getUTCMinutes()).padStart(2, "0");
	const ss = String(date.getUTCSeconds()).padStart(2, "0");
	return {
		date: `${day} ${month} ${year}`,
		time: `${hh}:${mm}:${ss}Z`,
	};
};

const ensureMetaDate = (
	gedcom: GedComType,
	record: Common,
	tag: "CREA" | "CHAN",
	when: Date,
	restores: RestoreFn[]
) => {
	if (record.get(tag)) {
		return;
	}

	const { date, time } = formatGedcom7Timestamp(when);
	const meta = createCommon(gedcom, undefined, record);
	meta.type = tag;
	const dateNode = createCommonDate(gedcom, undefined, record, meta);
	dateNode.type = "DATE";
	dateNode.value = date;
	dateNode.set("TIME", time);
	meta.set("DATE", dateNode);
	record.set(tag, meta);

	restores.push(() => {
		record.remove(tag);
	});
};

const ensureUid = (record: Common, restores: RestoreFn[]) => {
	const existing = record.get("UID")?.toValue();
	if (typeof existing === "string" && existing.trim()) {
		return;
	}
	const uid = createGedcomUid();
	record.set("UID", uid);
	restores.push(() => {
		record.remove("UID");
	});
};

/**
 * Temporarily add missing UID / CREA / CHAN on top-level records for GEDCOM 7
 * export. Returns a restore callback for live datasets.
 */
export const applyGedcom7RecordMetadata = (
	gedcom: GedComType,
	options?: { now?: Date }
): RestoreFn => {
	const restores: RestoreFn[] = [];
	const now = options?.now ?? new Date();

	const visit = (record: Common | undefined) => {
		if (!record?.id) {
			return;
		}
		ensureUid(record, restores);
		ensureMetaDate(gedcom, record, "CREA", now, restores);
		ensureMetaDate(gedcom, record, "CHAN", now, restores);
	};

	gedcom.indis()?.forEach((indi) => visit(indi));
	gedcom.fams()?.forEach((fam) => visit(fam));
	gedcom.objes()?.forEach((obje) => visit(obje));
	gedcom.sours()?.forEach((sour) => visit(sour));
	gedcom.repos()?.forEach((repo) => visit(repo));
	gedcom.subms()?.forEach((subm) => visit(subm));
	gedcom.snotes()?.forEach((note) => visit(note));

	return () => {
		for (let i = restores.length - 1; i >= 0; i -= 1) {
			restores[i]?.();
		}
	};
};
