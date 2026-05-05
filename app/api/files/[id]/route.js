import connectDB from "@/lib/dbConfig";
import File from "@/models/file";
import Version from "../../../../models/Versions";   // ⭐ NEW IMPORT

import { cookies } from "next/headers";
import { getSession } from "@/lib/session";

console.log("🔥 FILE [id] ROUTE LOADED");

/* =========================
   UPDATE FILE + SAVE VERSION
   ========================= */
export async function PUT(request, context) {
  const { id } = await context.params;
  const body = await request.json();

  await connectDB();

  const updated = await File.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  // Save a version snapshot whenever content actually changed.
  // Tag it with the logged-in user when there's a session; otherwise anon.
  if (typeof body.content === "string" && body.content.length > 0) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const session = getSession(token);

    await Version.create({
      fileId: id,
      content: body.content,
      userId: session?.userId || null,
      label: session ? "Auto-save" : "Auto-save (anonymous)",
    });
  }

  return Response.json(updated);
}


/* =========================
   DELETE FILE
   ========================= */
export async function DELETE(request, context) {
  try {
    const { id } = await context.params;

    console.log("DELETE FILE ID:", id);

    await connectDB();

    const deleted = await File.findByIdAndDelete(id);

    if (!deleted) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    return Response.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error("DELETE FILE ERROR:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}

