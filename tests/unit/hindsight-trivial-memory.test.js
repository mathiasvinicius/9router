import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isTrivialMemoryText,
  recallForProfile,
  retainForProfile,
} from "@/lib/identityMemory/hindsight.js";

const profile = {
  id: "eve",
  name: "EVE",
  memoryEnabled: true,
  hindsightBankId: "eve",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Hindsight trivial-message filtering", () => {
  it.each([
    "Oi?",
    "Olá!",
    "bom dia",
    "Tudo bem?",
    "ok",
    "valeu!",
  ])("recognizes %j as trivial", (text) => {
    expect(isTrivialMemoryText(text)).toBe(true);
  });

  it("ignores context injected after a greeting", () => {
    expect(isTrivialMemoryText("Oi?\n\n═══ EVE TEMPERAMENT\nstate: calm")).toBe(true);
  });

  it("does not classify meaningful messages as trivial", () => {
    expect(isTrivialMemoryText("Oi, procure as memórias da MILE")).toBe(false);
    expect(isTrivialMemoryText("Como vai funcionar o Hindsight?")).toBe(false);
  });

  it("skips recall and retain network calls for a greeting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      messages: [{
        role: "user",
        content: "Oi?\n\n═══ EVE TEMPERAMENT\nstate: calm",
      }],
    };

    await expect(recallForProfile(profile, body)).resolves.toBe("");
    await expect(retainForProfile(profile, body, "conversation-test")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
