import connectDB from "@/lib/dbConfig";
import File from "@/models/file";

console.log("🔥 FILE [id] ROUTE LOADED");

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

  return Response.json(updated);
}


export async function DELETE(request, context) {
  const { id } = await context.params;

  console.log("DELETE FILE ID:", id);

  await connectDB();

  const deleted = await File.findByIdAndDelete(id);

  if (!deleted) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  return Response.json({ message: "Deleted successfully" });
}
