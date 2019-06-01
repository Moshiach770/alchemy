import { BigNumber } from 'bignumber.js';

export enum SortOrder {
  ASC = 1,
  DESC = -1,
}

export const evaluateString = (a: string, b: string, sortOrder: SortOrder = SortOrder.ASC) => {
  if (!a && !b) { return 0; }

  if (!a) { return -sortOrder; }
  if (!b) { return sortOrder; }

  a = a.toLowerCase();
  b = b.toLowerCase();

  return a.localeCompare(b) * sortOrder;
}

export const evaluateBigNumber = (a: BigNumber, b: BigNumber, sortOrder: SortOrder = SortOrder.ASC) => {
  const isDefinedA = isDefined(a);
  const isDefinedB = isDefined(b);

  if (!isDefinedA && !isDefinedB) { return 0; }

  if (!isDefinedA) { return -sortOrder; }
  if (!isDefinedB) { return sortOrder; }

  const diff = a.minus(b);

  return ((diff.gt(0) ? 1 : (diff.lt(0) ? -1 : 0))) * sortOrder;
}

export const evaluateNumber = (a: number, b: number, sortOrder: SortOrder = SortOrder.ASC) => {
  const isDefinedA = isDefined(a);
  const isDefinedB = isDefined(b);

  if (!isDefinedA && !isDefinedB) { return 0; }

  if (!isDefinedA) { return -sortOrder; }
  if (!isDefinedB) { return sortOrder; }

  return (a - b) * sortOrder;
}

export const evaluateDateTime = (valueA: string, valueB: string, sortOrder: SortOrder = SortOrder.ASC) => {

  const a = new Date(valueA).valueOf();
  const b = new Date(valueB).valueOf();

  if (!a && !b) { return 0; }

  if (!a) { return -sortOrder; }
  if (!b) { return sortOrder; }

  return (a - b) * sortOrder;
}

export const isDefined = (v: any): boolean => {
  return typeof v !== 'undefined';
}
