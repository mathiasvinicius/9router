const DEFAULT_HINDSIGHT_URL = "http://127.0.0.1:8888";

function baseUrl() {
  return String(process.env.HINDSIGHT_API_URL || DEFAULT_HINDSIGHT_URL).replace(/\/+$/, "");
}

export async function ensureBank(bankId, name) {
  const response = await fetch(`${baseUrl()}/v1/default/banks/${encodeURIComponent(bankId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name || bankId,
      mission: `Long-term memory for the 9Router identity ${name || bankId}.`,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Hindsight rejected bank ${bankId}`);
}

export async function ensureMentalModel(bankId, mentalModelId, name) {
  const itemUrl = `${baseUrl()}/v1/default/banks/${encodeURIComponent(bankId)}/mental-models/${encodeURIComponent(mentalModelId)}`;
  const current = await fetch(itemUrl, { signal: AbortSignal.timeout(5000) });
  if (current.ok) return current.json();
  if (current.status !== 404) throw new Error(`Failed to inspect mental model ${mentalModelId}`);

  const response = await fetch(
    `${baseUrl()}/v1/default/banks/${encodeURIComponent(bankId)}/mental-models`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: mentalModelId,
        name: `Automatic profile: ${name || mentalModelId}`,
        source_query: `Build a current, internally consistent profile of ${name || "this identity"}: preferences, relationships, communication style, ongoing goals, important decisions and stable context. Resolve contradictions in favor of the most recent evidence. Do not invent facts.`,
        max_tokens: 3072,
        trigger: {
          mode: "delta",
          refresh_after_consolidation: true,
          fact_types: ["world", "experience", "observation"],
          exclude_mental_models: true,
        },
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error(`Hindsight rejected mental model ${mentalModelId}`);
  return response.json();
}

export async function mentalModelForProfile(profile) {
  if (!profile?.memoryEnabled || !profile?.hindsightBankId || !profile?.mentalModelId) return "";
  try {
    const response = await fetch(
      `${baseUrl()}/v1/default/banks/${encodeURIComponent(profile.hindsightBankId)}/mental-models/${encodeURIComponent(profile.mentalModelId)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return "";
    const payload = await response.json();
    return typeof payload?.content === "string" ? payload.content : "";
  } catch {
    return "";
  }
}

export async function listBankMemories(bankId, limit = 50, offset = 0) {
  const url = new URL(`${baseUrl()}/v1/default/banks/${encodeURIComponent(bankId)}/memories/list`);
  url.searchParams.set("limit", String(Math.min(100, Math.max(1, limit))));
  url.searchParams.set("offset", String(Math.max(0, offset)));
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Failed to list Hindsight memories");
  return response.json();
}

export async function clearBankMemories(bankId) {
  const response = await fetch(
    `${baseUrl()}/v1/default/banks/${encodeURIComponent(bankId)}/memories`,
    { method: "DELETE", signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Failed to clear Hindsight memories");
  return response.json();
}

function lastUserText(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : Array.isArray(body?.input) ? body.input : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
      return message.content.map((part) => part?.text || part?.content || "").filter(Boolean).join("\n");
    }
  }
  return "";
}

export async function recallForProfile(profile, body) {
  if (!profile?.memoryEnabled || !profile?.hindsightBankId) return "";
  const query = lastUserText(body).trim();
  if (!query) return "";
  try {
    const response = await fetch(
      `${baseUrl()}/v1/default/banks/${encodeURIComponent(profile.hindsightBankId)}/memories/recall`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          types: ["world", "experience", "observation"],
          prefer_observations: true,
          budget: "low",
          max_tokens: 1400,
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) return "";
    const payload = await response.json();
    if (typeof payload?.text === "string") return payload.text;
    if (typeof payload?.context === "string") return payload.context;
    const items = payload?.results || payload?.memories || [];
    return Array.isArray(items)
      ? items.map((item) => item?.text || item?.content || item?.fact || "").filter(Boolean).join("\n")
      : "";
  } catch {
    return "";
  }
}

export async function retainForProfile(profile, body, documentId) {
  if (!profile?.memoryEnabled || !profile?.hindsightBankId) return;
  const content = lastUserText(body).trim();
  if (!content) return;
  try {
    await fetch(
      `${baseUrl()}/v1/default/banks/${encodeURIComponent(profile.hindsightBankId)}/memories`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          async: true,
          items: [{
            content,
            context: `9Router conversation for ${profile.name || profile.id}`,
            document_id: documentId,
            tags: [`api-key:${profile.id}`],
          }],
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch {
    // Memory is fail-open and must never break inference.
  }
}
