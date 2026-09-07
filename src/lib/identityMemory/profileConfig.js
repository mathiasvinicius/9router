import { randomUUID } from "node:crypto";

const BANK_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function profileSlug(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "profile";
}

/**
 * Resolve the optional Hindsight portion of an API-key profile.
 *
 * Disabled memory deliberately detaches both the bank and mental model. It
 * does not delete the remote bank, so re-enabling it later is safe.
 */
export function resolveMemoryProfile({ enabled, bankId, mentalModelId, name }) {
  if (!enabled) {
    return {
      memoryEnabled: false,
      hindsightBankId: null,
      mentalModelId: null,
    };
  }

  const normalizedBankId = String(bankId || "").trim();
  if (!normalizedBankId || !BANK_ID_PATTERN.test(normalizedBankId)) {
    throw new Error("A valid Hindsight bank ID is required when memory is enabled");
  }

  return {
    memoryEnabled: true,
    hindsightBankId: normalizedBankId,
    mentalModelId: mentalModelId || `${profileSlug(name)}-${randomUUID().slice(0, 8)}`,
  };
}

