// ── Account (from getAllAccounts response) ─────────────────────────────────
// Response shape: [{ id: 1, value: "IOTEdge (Acc-001)" }, ...]
export interface SimAccount {
  id: number;
  value: string;
}

// ── Carrier / Network Provider ─────────────────────────────────────────────
export interface SimCarrier {
  id: number;
  name: string;
}

// ── Summary (for metric cards on list page) ────────────────────────────────
export interface SimSummary {
  totalSims: number;
  enabled: number;
  disabled: number;
  activeCarriers: number;
}

// ── List item (mapped from GET /sim paginated response) ────────────────────
export interface SimItem {
  simId: number; // API: simId
  iccid: string; // API: iccid
  msisdn: string; // API: msisdn
  imsi: string; // API: imsi
  carrier: string; // derived: carrier name string for display
  statusKey: string; // API: statusKey → "active" | "inactive"
  expiryAt: string | null; // API: expiryAt
  updatedAt: string | null; // API: updatedAt
}

// ── Form data (used in ProvisionSim add/edit form) ─────────────────────────
export interface SimFormData {
  // Hardware Identity
  accountId: number; // API: accountId
  iccid: string; // API: iccid
  msisdn: string; // API: msisdn
  imsi: string; // API: imsi (NOT imsiCode)

  // Carrier Details
  networkProviderId: number; // API: networkProviderId (NOT carrierId)
  activatedAt: string; // API: activatedAt (NOT activatedOn)  — stored as YYYY-MM-DD for input[type=date]
  expiryAt: string; // API: expiryAt (NOT contractExpiry)  — stored as YYYY-MM-DD for input[type=date]

  // Status
  statusKey: string; // API: statusKey → "active" | "inactive" (NOT boolean status)
}
