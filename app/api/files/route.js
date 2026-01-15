import connectDB from "@/lib/dbConfig";
import File from "@/models/file";

export async function GET(request) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return Response.json({ error: "projectId required" }, { status: 400 });
    }
    
    const files = await File.find({ projectId }).sort({ createdAt: 1 });
    return Response.json(files);
  } catch (error) {
    console.error("Get files error:", error);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  
  try {
    const body = await request.json();
    const { name, content, projectId, type, parentId } = body;
    
    if (!name || !projectId || !type) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    
    const newFile = await File.create({
      name,
      content: content || '',
      projectId,
      type,
      parentId: parentId || null
    });
    
    return Response.json(newFile, { status: 201 });
  } catch (error) {
    console.error("Create file error:", error);
    return Response.json({ error: "Failed to create" }, { status: 500 });
  }
}