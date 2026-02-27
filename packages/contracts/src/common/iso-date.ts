import { z } from "zod";

/**
 * Branded type for ISO 8601 date strings in wire/API types.
 * Domain types use `Date`; wire types use `IsoDateString`.
 */
export type IsoDateString = string & { readonly __brand: "IsoDateString" };

export const isoDateSchema = z.string().datetime();
