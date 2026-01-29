/* eslint-disable no-console */
import type { Command } from "commander";
import type { GedCom } from "../../classes/gedcom";
import type { IndiType } from "../../classes/indi";
import { List } from "../../classes/list";
import type { IndiKey } from "../../types/types";
import GedcomTree from "../../utils/parser";
import {
	formatHeader,
	formatListItem,
	formatId,
	formatName,
	formatError,
} from "../utils/formatters";
import { readGedcomFile, handleError, cleanGedcomName } from "../utils/helpers";

/**
 * Show detailed information about an individual (reusable core logic)
 */
export function showIndividual(tree: GedCom, individual: IndiType): void {
	const name = cleanGedcomName(individual.NAME?.toValue());
	console.log(
		formatHeader(`\n${formatId(individual.id ?? "")} ${formatName(name)}`)
	);
	console.log("");

	if (individual.SEX?.value) {
		console.log(formatListItem(`Sex: ${individual.SEX.value}`));
	}

	if (individual.BIRT) {
		const date = individual.BIRT.DATE?.toValue();
		const place = individual.BIRT.PLAC?.value;
		console.log(
			formatListItem(
				`Birth: ${date || "?"}${place ? ` at ${place}` : ""}`
			)
		);
	}

	if (individual.DEAT) {
		const date = individual.DEAT.DATE?.toValue();
		const place = individual.DEAT.PLAC?.value;
		console.log(
			formatListItem(
				`Death: ${date || "?"}${place ? ` at ${place}` : ""}`
			)
		);
	}

	// Show parents
	const parentFams = individual.FAMC;
	if (parentFams) {
		const parentList =
			parentFams instanceof List ? parentFams.values() : [parentFams];
		console.log(formatListItem("\nParents:"));
		parentList.forEach((famRef) => {
			if (famRef) {
				const fam = tree.fam(famRef.value);
				if (fam) {
					const father = fam.HUSB
						? tree.indi(fam.HUSB.value as IndiKey)
						: null;
					const mother = fam.WIFE
						? tree.indi(fam.WIFE.value as IndiKey)
						: null;

					if (father) {
						const fatherName = cleanGedcomName(
							father.NAME?.toValue()
						);
						console.log(
							formatListItem(
								`  ${formatId(father.id as IndiKey)} ${formatName(fatherName)}`
							)
						);
					}
					if (mother) {
						const motherName = cleanGedcomName(
							mother.NAME?.toValue()
						);
						console.log(
							formatListItem(
								`  ${formatId(mother.id as IndiKey)} ${formatName(motherName)}`
							)
						);
					}
				}
			}
		});
	}

	// Show spouses
	const spouseFams = individual.FAMS;
	if (spouseFams) {
		const famList =
			spouseFams instanceof List ? spouseFams.values() : [spouseFams];
		console.log(formatListItem("\nSpouses:"));
		famList.forEach((famRef) => {
			if (famRef) {
				const fam = tree.fam(famRef.value);
				if (fam) {
					const spouseRef =
						fam.HUSB?.value === individual.id ? fam.WIFE : fam.HUSB;
					if (spouseRef) {
						const spouse = tree.indi(spouseRef.value as IndiKey);
						if (spouse) {
							const spouseName = cleanGedcomName(
								spouse.NAME?.toValue()
							);
							console.log(
								formatListItem(
									`  ${formatId(spouse.id as IndiKey)} ${formatName(spouseName)}`
								)
							);
						}
					}
				}
			}
		});
	}

	// Show children
	if (spouseFams) {
		const famList =
			spouseFams instanceof List ? spouseFams.values() : [spouseFams];
		let hasChildren = false;

		famList.forEach((famRef) => {
			if (famRef) {
				const fam = tree.fam(famRef.value);
				if (fam && fam.CHIL) {
					if (!hasChildren) {
						console.log(formatListItem("\nChildren:"));
						hasChildren = true;
					}

					const children =
						fam.CHIL instanceof List
							? fam.CHIL.values()
							: [fam.CHIL];
					children.forEach((childRef) => {
						if (childRef) {
							const child = tree.indi(childRef.value as IndiKey);
							if (child) {
								const childName = cleanGedcomName(
									child.NAME?.toValue()
								);
								console.log(
									formatListItem(
										`  ${formatId(child.id ?? "")} ${formatName(childName)}`
									)
								);
							}
						}
					});
				}
			}
		});
	}

	console.log("");
}

export function registerShowCommand(program: Command): void {
	program
		.command("show <file> <id>")
		.description("Display detailed information about an individual")
		.action((file: string, id: string) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);
				const individual = tree.indi(id as IndiKey);

				if (!individual) {
					console.error(formatError(`Individual ${id} not found`));
					process.exit(1);
				}

				showIndividual(tree, individual);
			} catch (error) {
				handleError(error, "Failed to show individual");
			}
		});
}
