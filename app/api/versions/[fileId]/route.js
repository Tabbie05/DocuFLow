import connectDB from "@/lib/dbConfig";
import Version from "@/models/version";

export async function GET(request, { params }) {
  await connectDB();

  try {
    const versions = await Version.find({ fileId: params.fileId })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    return Response.json(versions);
  } catch (error) {
    console.error("Get versions error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
