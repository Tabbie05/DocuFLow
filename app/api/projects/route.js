import connectDB from "../../../lib/dbConfig";
import Project from "../../../models/Project";


export async function POST(request) {
  const { name } = await request.json();
  if (!name) {
    return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
  }

  const project = await Project.create({ name });
  return new Response(JSON.stringify(project), { status: 201 });
}

export async function GET(request) {
    await connectDB();
    try{
        const projects = await Project.find().sort({ createdAt: -1 });
        return new Response(JSON.stringify(projects), { status: 200 });
    }
    catch(error){
        return new Response("Failed to fetch projects", { status: 500 });
    }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("id");
    if (!projectId) {
        return new Response(JSON.stringify({ error: "Project ID is required" }), { status: 400 });
    }
    try{
        await connectDB();
        await Project.findByIdAndDelete(projectId);
        return new Response(JSON.stringify({ message: "Project deleted successfully" }), { status: 200 });
    }
    catch(error){
        return new Response("Failed to delete project", { status: 500 });
    }
}
