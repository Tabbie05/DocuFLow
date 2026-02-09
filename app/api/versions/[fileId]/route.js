import connectDB from "@/lib/dbConfig";
import Version from "@/models/version";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  await connectDB();
  
  try {
    // Get user from session
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    const session = getSession(token);
    
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, content, label } = body;
    
    if (!fileId || !content) {
      return Response.json({ error: "Missing fileId or content" }, { status: 400 });
    }

    // Create new version
    const version = await Version.create({
      fileId,
      userId: session.userId,
      content,
      label: label || "Manual save"
    });

    // Populate user info
    await version.populate('userId', 'username');

    return Response.json(version, { status: 201 });
  } catch (error) {
    console.error("Create version error:", error);
    return Response.json({ error: "Failed to create version" }, { status: 500 });
  }
}