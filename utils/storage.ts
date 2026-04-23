export const getStoredAccountId = (fallbackAccountId?: unknown): number => {
  const resolved = Number(fallbackAccountId || 0);
  if (Number.isFinite(resolved) && resolved > 0) return resolved;
  if (typeof window === "undefined") return 0;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userAccountId = Number(user?.accountId || user?.AccountId || 0);
    if (Number.isFinite(userAccountId) && userAccountId > 0) return userAccountId;
  } catch {
    // ignore
  }

  const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
  return Number.isFinite(selectedAccountId) && selectedAccountId > 0
    ? selectedAccountId
    : 0;
};

export const getStoredUserId = (): string => {
  if (typeof window === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(user?.userId || user?.UserId || "").trim();
  } catch {
    return "";
  }
};

export const getStoredUserData = (): { accountId: number; userId: string } => {
  if (typeof window === "undefined") return { accountId: 0, userId: "" };

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      accountId: Number(user?.accountId || user?.AccountId || 0),
      userId: String(user?.userId || user?.UserId || "").trim(),
    };
  } catch {
    return { accountId: 0, userId: "" };
  }
};

export const persistSelectedAccountId = (accountId: number) => {
  if (typeof window === "undefined") return;
  const resolved = Number(accountId || 0);
  if (!Number.isFinite(resolved) || resolved <= 0) return;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...(user && typeof user === "object" ? user : {}),
        accountId: resolved,
      }),
    );
  } catch {
    localStorage.setItem("user", JSON.stringify({ accountId: resolved }));
  }
};

