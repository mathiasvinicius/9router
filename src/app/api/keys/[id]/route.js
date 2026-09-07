import { NextResponse } from "next/server";
import { deleteApiKey, getApiKeyById, getComboById, updateApiKey } from "@/lib/localDb";
import { ensureBank, ensureMentalModel } from "@/lib/identityMemory/hindsight.js";
import { resolveMemoryProfile } from "@/lib/identityMemory/profileConfig.js";

// GET /api/keys/[id] - Get single key
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ key });
  } catch (error) {
    console.log("Error fetching key:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

// PUT /api/keys/[id] - Update key
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, name, comboId, soul, hindsightBankId, memoryEnabled } = body;

    const existing = await getApiKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = String(name).trim();
    if (comboId !== undefined) {
      if (!comboId || !(await getComboById(comboId))) {
        return NextResponse.json({ error: "A valid combo is required" }, { status: 400 });
      }
      updateData.comboId = comboId;
    }
    if (soul !== undefined) updateData.soul = String(soul);
    if (hindsightBankId !== undefined || memoryEnabled !== undefined) {
      let memoryProfile;
      try {
        memoryProfile = resolveMemoryProfile({
          enabled: memoryEnabled === undefined ? existing.memoryEnabled : !!memoryEnabled,
          bankId: hindsightBankId === undefined ? existing.hindsightBankId : hindsightBankId,
          mentalModelId: existing.mentalModelId,
          name: updateData.name || existing.name,
        });
      } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      Object.assign(updateData, memoryProfile);
      if (memoryProfile.memoryEnabled) {
        await ensureBank(memoryProfile.hindsightBankId, updateData.name || existing.name);
        await ensureMentalModel(
          memoryProfile.hindsightBankId,
          memoryProfile.mentalModelId,
          updateData.name || existing.name,
        );
      }
    }

    const updated = await updateApiKey(id, updateData);

    return NextResponse.json({ key: updated });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// DELETE /api/keys/[id] - Delete API key
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const deleted = await deleteApiKey(id);
    if (!deleted) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Key deleted successfully" });
  } catch (error) {
    console.log("Error deleting key:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
