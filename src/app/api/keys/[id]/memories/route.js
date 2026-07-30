import { NextResponse } from "next/server";
import { getApiKeyById } from "@/lib/localDb";
import { clearBankMemories, listBankMemories } from "@/lib/identityMemory/hindsight.js";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key?.hindsightBankId) {
      return NextResponse.json({ error: "No Hindsight bank assigned" }, { status: 404 });
    }
    const url = new URL(request.url);
    const data = await listBankMemories(
      key.hindsightBankId,
      Number(url.searchParams.get("limit") || 50),
      Number(url.searchParams.get("offset") || 0),
    );
    return NextResponse.json({ bankId: key.hindsightBankId, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key?.hindsightBankId) {
      return NextResponse.json({ error: "No Hindsight bank assigned" }, { status: 404 });
    }
    const data = await clearBankMemories(key.hindsightBankId);
    return NextResponse.json({ bankId: key.hindsightBankId, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
