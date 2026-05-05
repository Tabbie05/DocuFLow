import connectDB from "@/lib/dbConfig";
import Version from "@/models/Versions";
// Import User so mongoose registers the schema and populate("userId") works
// even on cold reloads where this route runs before any /api/me call.
import "@/models/User";

export async function GET(request, context) {
  await connectDB();

  try {
    const { fileId } = await context.params;
    const versions = await Version.find({ fileId })
      .populate("userId", "username")
      .sort({ createdAt: -1 })
      .limit(100);

    return Response.json(versions);
  } catch (error) {
    console.error("Get versions error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
