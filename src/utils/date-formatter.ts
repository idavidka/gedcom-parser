import { createCommonDate } from "../classes/date";
import type { CommonDate } from "../classes/date";
import type {FamType} from "../classes/fam";
import type {IndiType} from "../classes/indi";
import { i18n } from "../factories/i18n-factory";
import type IDateStructure from "../structures/date";
import type IEventDetailStructure from "../structures/event-detail-structure";
import type { IndiKey } from "../types/types";
import { getAllProp } from "./get-all-prop";

export const ACCEPTED_DATE_FORMATS = [
	"yyyy.MM.dd.",
	"yyyy-MM-dd",
	"MM/dd/yyyy",
];
export const ACCEPTED_DATE_FORMATS_REGEX = new RegExp(
	`(${ACCEPTED_DATE_FORMATS.map((acceptedFormat) =>
		acceptedFormat.replace(/[^.\-/]/g, "\\d")
	).join("|")})`,
	"gi"
);
export const commonDateFormatter = (
	date?: IDateStructure["DATE"],
	format = "yyyy",
	prefix = ""
) => {
	const formattedDate = date?.toValue(format);
	if (!formattedDate) {
		return undefined;
	}

	return `${prefix}${formattedDate}`.trim();
};

export const noteDateFormatter = (
	date?: IDateStructure["DATE"],
	format = "yyyy",
	prefix = "",
	shortNote = true,
	showNote = true
) => {
	const rawDate = commonDateFormatter(date, format, "");

	if (!rawDate) {
		return undefined;
	}

	const note = date?.toNote(shortNote) ?? "";

	return `${prefix}${
		note && showNote
			? i18n.t(`${note} {{date}}`, { date: rawDate })
			: rawDate
	}`;
};

export const marriageDateFormatter = (
	fam?: FamType,
	showDays = false,
	showPlaces = false,
	shortNote = true,
	showNote = true,
	showDisplayTextIfNoDate = true,
	showAllEvents = false,
	dateFormatPattern?: string
) => {
	// Determine the format to use for full dates
	const fullDateFormat = dateFormatPattern ?? i18n.t("dateFormat");

	const marriageDates: Array<CommonDate | undefined> = [];
	const marriagePlaces: Array<string | undefined> = [];
	const marriages = (fam?.toValueList().values() ?? []).flatMap((fam) => {
		const family = fam as FamType | undefined;

		// Get all MARR events for this family
		const marrEvents = (family?.MARR?.toList().values() ?? []).filter(
			Boolean
		);

		if (marrEvents.length === 0) {
			// Handle displayText for families without MARR events
			const displayText = (family?.get("DISPLAYTEXT")?.toValue() ??
				"") as string;
			if (showDisplayTextIfNoDate && displayText) {
				const displayDate = displayText.match(
					ACCEPTED_DATE_FORMATS_REGEX
				)?.[0] as string | undefined;
				if (displayDate) {
					marriagePlaces.push(displayText.replace(displayDate, ""));
					const marriageDate = createCommonDate(
						fam?.getGedcom(),
						undefined,
						family
					);
					marriageDate.value = displayDate;
					marriageDates.push(marriageDate);
				} else {
					marriagePlaces.push(displayText);
					marriageDates.push(undefined);
					return ["∞"];
				}
			}
			return [];
		}

		// Process all MARR events
		const eventsToProcess = showAllEvents
			? marrEvents
			: marrEvents.slice(0, 1);
		return eventsToProcess.map((marrEvent) => {
			const marriageEventDetail = marrEvent as
				| IEventDetailStructure
				| undefined;
			const marriageDate = marriageEventDetail?.DATE;
			const marriagePlace = showPlaces
				? marriageEventDetail?.PLAC?.value
				: undefined;

			marriagePlaces.push(marriagePlace);
			marriageDates.push(marriageDate);

			const formattedDate = noteDateFormatter(
				marriageDate,
				showDays ? fullDateFormat : "yyyy",
				"∞",
				shortNote,
				showNote
			);

			return formattedDate ? formattedDate : undefined;
		});
	}) as Array<string | undefined>;

	const marriageArray = marriages.length
		? (marriages.filter(Boolean) as string[])
		: [];
	const datesArray = marriageArray.filter(Boolean);

	const placesArray = marriagePlaces.filter(Boolean);

	const dates = datesArray.join(" ").trim();

	return {
		rawArray: marriageDates,
		inArray: datesArray,
		inOrder: dates,
		places: placesArray,
		marriage: marriageArray,
		...(showPlaces
			? {
					marriages,
					marriagePlaces,
				}
			: {}),
	};
};

export const dateFormatter = (
	indi?: IndiType,
	showMarriages = false,
	showDays = false,
	showPlaces = false,
	shortNote = true,
	showNote = true,
	isOnStage?: (key: IndiKey) => boolean,
	showAllEvents = false,
	dateFormatPattern?: string
) => {
	// Determine the format to use for full dates
	const fullDateFormat = dateFormatPattern ?? i18n.t("dateFormat");

	// Get all birth events
	const birthEvents = getAllProp<IEventDetailStructure>(indi, "BIRT");
	const firstBirthValue = birthEvents[0];

	// Get all death events
	const deathEvents = getAllProp<IEventDetailStructure>(indi, "DEAT");
	const firstDeathValue = deathEvents[0];

	const birth = commonDateFormatter(
		firstBirthValue?.DATE,
		showDays ? fullDateFormat : "yyyy"
	) as string | undefined;
	const birthPlace = showPlaces ? firstBirthValue?.PLAC?.value : undefined;
	const death = commonDateFormatter(
		firstDeathValue?.DATE,
		showDays ? fullDateFormat : "yyyy"
	) as string | undefined;
	const deathPlace = showPlaces ? firstDeathValue?.PLAC?.value : undefined;
	const marriagePlaces: Array<string | undefined> = [];
	const marriages: (string | undefined)[] = [];

	if (showMarriages || isOnStage) {
		(indi?.get("FAMS")?.toValueList().values() ?? []).forEach((fam) => {
			const famRef = fam?.ref as FamType | undefined;
			if (isOnStage && famRef) {
				let partner: IndiKey | undefined;
				if (famRef.HUSB && indi && famRef.HUSB.value === indi.id) {
					partner = famRef.WIFE?.value as IndiKey | undefined;
				} else if (
					famRef.WIFE &&
					indi &&
					famRef.WIFE.value === indi.id
				) {
					partner = famRef.HUSB?.value as IndiKey | undefined;
				}

				if (partner && isOnStage(partner)) {
					return;
				}
			}
			const marriageDates = marriageDateFormatter(
				famRef,
				showDays,
				showPlaces,
				shortNote,
				showNote,
				true,
				showAllEvents,
				dateFormatPattern
			);

			marriages.push(...(marriageDates?.marriage ?? []));
			marriagePlaces.push(...(marriageDates?.marriagePlaces ?? []));
		});
	}

	// Process all birth events
	const birthStrings: string[] = [];
	const birthPlaces: Array<string | undefined> = [];
	const eventsToProcess = showAllEvents
		? birthEvents
		: birthEvents.slice(0, 1);
	eventsToProcess.forEach((birthEvent) => {
		const birthDate = commonDateFormatter(
			birthEvent?.DATE,
			showDays ? fullDateFormat : "yyyy"
		) as string | undefined;
		const birthEventNote = birthEvent?.DATE?.toNote(shortNote) ?? "";
		const birthEventPlace = showPlaces
			? birthEvent?.PLAC?.value
			: undefined;

		if (birthDate) {
			birthStrings.push(
				`*${
					birthEventNote && showNote
						? i18n.t(`${birthEventNote} {{date}}`, {
								date: birthDate,
							})
						: birthDate
				}`
			);
		}
		birthPlaces.push(birthEventPlace);
	});

	// Process all death events
	const deathStrings: string[] = [];
	const deathPlaces: Array<string | undefined> = [];
	const deathEventsToProcess = showAllEvents
		? deathEvents
		: deathEvents.slice(0, 1);
	deathEventsToProcess.forEach((deathEvent) => {
		const deathDate = commonDateFormatter(
			deathEvent?.DATE,
			showDays ? fullDateFormat : "yyyy"
		) as string | undefined;
		const deathEventNote = deathEvent?.DATE?.toNote(shortNote) ?? "";
		const deathEventPlace = showPlaces
			? deathEvent?.PLAC?.value
			: undefined;

		if (deathDate) {
			deathStrings.push(
				`†${
					deathEventNote && showNote
						? i18n.t(`${deathEventNote} {{date}}`, {
								date: deathDate,
							})
						: deathDate
				}`
			);
		}
		deathPlaces.push(deathEventPlace);
	});

	const birthString = birthStrings[0] ?? "";
	const deathString = deathStrings[0] ?? "";
	const marriageArray = marriages.length
		? (marriages.filter(Boolean) as string[])
		: [];
	const datesArray =
		!birth && !death
			? marriageArray
			: [...birthStrings, ...marriageArray, ...deathStrings];

	const placesArray =
		!birth && !death
			? marriagePlaces
			: [...birthPlaces, ...marriagePlaces, ...deathPlaces];

	const nonNullDatesArray = datesArray.filter(Boolean);
	const dates = nonNullDatesArray.join(" ").trim();

	return {
		inArray: nonNullDatesArray,
		inOrder: dates,
		places: placesArray,
		birth: birthString,
		marriage: marriageArray,
		death: deathString,
		...(showPlaces
			? {
					birthPlace,
					deathPlace,
					...(showMarriages ? { marriages, marriagePlaces } : {}),
				}
			: {}),
		...(showAllEvents
			? {
					births: birthStrings,
					birthPlaces,
					deaths: deathStrings,
					deathPlaces,
				}
			: {}),
	};
};
