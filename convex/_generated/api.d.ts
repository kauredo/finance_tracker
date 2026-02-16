/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as goals from "../goals.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as recurring from "../recurring.js";
import type * as statements from "../statements.js";
import type * as statementsNode from "../statementsNode.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  admin: typeof admin;
  auth: typeof auth;
  budgets: typeof budgets;
  categories: typeof categories;
  crons: typeof crons;
  goals: typeof goals;
  households: typeof households;
  http: typeof http;
  "lib/access": typeof lib_access;
  recurring: typeof recurring;
  statements: typeof statements;
  statementsNode: typeof statementsNode;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
