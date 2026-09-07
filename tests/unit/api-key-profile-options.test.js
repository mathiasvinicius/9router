import { describe, expect, it } from "vitest";
import { resolveMemoryProfile } from "../../src/lib/identityMemory/profileConfig.js";

describe("API-key optional identity and memory options", () => {
  it("allows a profile with Hindsight disabled and no bank", () => {
    expect(resolveMemoryProfile({
      enabled: false,
      bankId: "",
      mentalModelId: null,
      name: "EVOS",
    })).toEqual({
      memoryEnabled: false,
      hindsightBankId: null,
      mentalModelId: null,
    });
  });

  it("requires a valid bank only when Hindsight is enabled", () => {
    expect(() => resolveMemoryProfile({ enabled: true, bankId: "", name: "test" }))
      .toThrow(/bank ID is required/i);
    expect(() => resolveMemoryProfile({ enabled: true, bankId: "invalid bank", name: "test" }))
      .toThrow(/bank ID is required/i);
  });

  it("creates a mental-model ID when enabling memory for a profile without one", () => {
    const result = resolveMemoryProfile({
      enabled: true,
      bankId: "evos-memory",
      mentalModelId: null,
      name: "EVOS Profile",
    });
    expect(result.memoryEnabled).toBe(true);
    expect(result.hindsightBankId).toBe("evos-memory");
    expect(result.mentalModelId).toMatch(/^evos-profile-[a-f0-9]{8}$/);
  });

  it("preserves an existing mental-model ID while memory remains enabled", () => {
    expect(resolveMemoryProfile({
      enabled: true,
      bankId: "eve",
      mentalModelId: "soberano",
      name: "EVE",
    }).mentalModelId).toBe("soberano");
  });
});
