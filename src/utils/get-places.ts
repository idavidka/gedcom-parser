import type { Common } from "../classes/common";
import { List } from "../classes/list";
import type { Tag } from "../types/types";

export interface Place {
	key: string;
	index: number;
	obj?: Common;
	ref?: Common;
	place?: string;
}

export enum PlaceType {
	All = "ALL",
	Birth = "BIRT",
	Marriage = "MARR",
	Death = "DEAT",
	Events = "EVEN",
	Military = "_MILT",
	MilitaryId = "_MILTID",
}

export const getPlaces = (
	common: Common | List,
	type: PlaceType | Tag | Array<PlaceType | Tag> = [PlaceType.All],
	maxLevel = 1,
	level = 0,
	mainKey?: string
) => {
	const types = Array.isArray(type) ? type : [type];
	const places: Place[] = [];
	if (!common?.toList || level > maxLevel) {
		return places;
	}

	const commonList = common.toList();

	commonList.forEach((item, _, index) => {
		(Object.entries(item) as Array<[string, Common]>).forEach(
			([key, value]) => {
				if (!/^[_A-Z0-9]+$/.test(key)) {
					return;
				}
				if (
					level === 0 &&
					!types.includes(PlaceType.All) &&
					((!types.includes(key as PlaceType) &&
						[
							PlaceType.Birth,
							PlaceType.Marriage,
							PlaceType.Death,
						].includes(key as PlaceType)) ||
						(!types.includes(PlaceType.Events) &&
							![
								PlaceType.Birth,
								PlaceType.Marriage,
								PlaceType.Death,
								PlaceType.Military,
								PlaceType.MilitaryId,
							].includes(key as PlaceType)) ||
						(!types.includes(PlaceType.Military) &&
							!types.includes(PlaceType.MilitaryId) &&
							![
								PlaceType.Birth,
								PlaceType.Marriage,
								PlaceType.Death,
								PlaceType.Events,
							].includes(key as PlaceType)))
				) {
					return;
				}
				if (key === "PLAC") {
					value.toList().forEach((place) => {
						places.push({
							index,
							place: place.toValue(),
							obj: place,
							key: mainKey || key,
						});
					});
				} else {
					getPlaces(
						value,
						types,
						maxLevel,
						level + 1,
						mainKey || key
					).forEach((place) => {
						const usedValue =
							value instanceof List
								? value.index(place.index)
								: value;
						places.push({
							place: place.place,
							obj: usedValue,
							ref: place.obj,
							index: place.index,
							key: place.key,
						});
					});
				}
			}
		);
	});

	return places;
};
