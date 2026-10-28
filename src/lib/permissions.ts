import type { BackendRole, Role } from "./api.types";

export const ROLE_LEVEL: Record<Role, number> = {
  client: 0,
  researcher: 1,
  trader: 2,
  compliance: 3,
  admin: 4,
};

export const ROLE_LABEL: Record<Role, string> = {
  client: "Investor",
  researcher: "Researcher",
  trader: "Trader (CSD Desk)",
  compliance: "Compliance & Supervision",
  admin: "Back-Office Admin",
};

export const BACKEND_ROLE_META: Record<
  BackendRole,
  { label: string; badge: string; description: string }
> = {
  INVESTOR: {
    label: "INVESTOR",
    badge: "Investor",
    description: "Retail or institutional client account",
  },
  TRADER: {
    label: "TRADER",
    badge: "Trader (CSD Desk)",
    description: "Executes trades on CSD/GSE platform & uploads contract notes",
  },
  RESEARCHER: {
    label: "RESEARCHER",
    badge: "Researcher",
    description: "Publishes market briefs, yield analysis & research reports",
  },
  COMPLIANCE: {
    label: "COMPLIANCE",
    badge: "Compliance",
    description: "Supervises KYC, audits trades & corrects client/order records",
  },
  ADMIN: {
    label: "ADMIN",
    badge: "Back-Office Admin",
    description: "Executes back-office trades, approves KYC & dispatches CSD/KYC/Indemnity",
  },
  SUPER_ADMIN: {
    label: "SUPER ADMIN",
    badge: "Super Admin",
    description: "Full executive & system configuration authority",
  },
};

export function can(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}

/** Staff roles (researchers, traders, compliance, admins) can open the staff area. */
export function isStaff(role: Role | undefined): boolean {
  return can(role, "researcher");
}

/** Roles allowed to execute CSD orders and upload contract notes. */
export function canTradeDesk(role: Role | undefined): boolean {
  return can(role, "trader");
}

/** Roles allowed to manage users, supervise KYC, and correct records. */
export function canAdminister(role: Role | undefined): boolean {
  return can(role, "compliance");
}
