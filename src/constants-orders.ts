/**
 * Orders stub for GEDCOM parser
 * These are placeholder orders that can be overridden by the host application
 */

import type { Order, OrderIterator } from "./types";

export const DEFAULT: Order = {};
export const BIRTH_ASC: Order = {};
export const BIRTH_DESC: Order = {};
export const DEATH_ASC: Order = {};
export const DEATH_DESC: Order = {};
export const DATE_ASC: Order = {};
export const DATE_DESC: Order = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNameDesc: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNameAsc: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBirthAsc: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNameAscAndBirth: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMarriageAsc: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMarriageAscAndChildBirth: OrderIterator<any, any> = () => 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMarriageAscAndBirth: OrderIterator<any, any> = () => 0;
