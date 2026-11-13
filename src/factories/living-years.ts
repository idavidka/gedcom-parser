/** Years with no death record still count as living. */
export const DEFAULT_LIVING_YEARS = 120;

let livingYears = DEFAULT_LIVING_YEARS;

/** Set from initGedcomParser. isLiving reads this value. */
export const setLivingYears = (years: number) => {
	if (!Number.isFinite(years) || years <= 0) {
		return;
	}
	livingYears = Math.round(years);
};

export const getLivingYears = () => livingYears;
