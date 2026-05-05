import connectDB from "@/lib/dbConfig";
import Version from "@/models/Versions";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request) {
  await connectDB();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const session = getSession(token);

    const body = await request.json();
    const { fileId, content, label } = body;

    if (!fileId || !content) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const version = await Version.create({
      fileId,
      userId: session?.userId || null,
      content,
      label: label || (session ? "Manual save" : "Manual save (anonymous)")
    });

    if (version.userId) await version.populate('userId', 'username');
    return Response.json(version, { status: 201 });
  } catch (error) {
    console.error("Create version error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
