import type { Role } from "./api.types";

export const ROLE_LEVEL: Record<Role, number> = {
  client: 0,
  trader: 1,
  compliance: 2,
  admin: 3,
};

export const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  trader: "Trader",
  compliance: "Compliance",
  admin: "Administrator",
};

export function can(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}

/** Staff roles (traders, compliance, admins) can open the staff area. */
export function isStaff(role: Role | undefined): boolean {
  return can(role, "trader");
}

/** Roles allowed to manage users and approve orders. */
export function canAdminister(role: Role | undefined): boolean {
  return can(role, "compliance");
}
