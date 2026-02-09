import connectDB from "@/lib/dbConfig";
import Version from "@/models/version";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  await connectDB();
  
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    const session = getSession(token);
    
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, content, label } = body;
    
    if (!fileId || !content) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const version = await Version.create({
      fileId,
      userId: session.userId,
      content,
      label: label || "Auto-save"
    });

    await version.populate('userId', 'username');
    return Response.json(version, { status: 201 });
  } catch (error) {
    console.error("Create version error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}