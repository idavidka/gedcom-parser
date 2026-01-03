import {
	type RequiredFilter,
	type Filter,
	RelationType,
	PartnerType,
} from "../types/types";

export const EVERY: Filter = {};

export const FEMALE: Filter = {
	SEX: "F",
};

export const MALE: Filter = {
	SEX: "M",
};

export const ADOPTED: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.ADOPTED,
};

export const BIRTH: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.BIRTH,
};

export const FOSTER: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.FOSTER,
};

export const SEALING: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.SEALING,
};

export const STEP: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.STEP,
};

export const BIOLOGICAL: RequiredFilter<"PEDI", RelationType> = {
	PEDI: RelationType.BIOLOGICAL,
};

export const FRIEND: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.FRIEND,
};

export const OTHER: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.OTHER,
};

export const PARTNER: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.PARTNER,
};

export const SINGLE: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.SINGLE,
};

export const SPOUSE: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.SPOUSE,
};

export const UNKOWN: RequiredFilter<"PART", PartnerType> = {
	PART: PartnerType.UNKOWN,
};
