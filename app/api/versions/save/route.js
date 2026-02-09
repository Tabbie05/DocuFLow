import connectDB from "@/lib/dbConfig";
import Version from "@/models/version";

export async function POST(request) {
  await connectDB();

  try {
    const body = await request.json();
    const { fileId, content } = body;

    if (!fileId || !content) {
      return Response.json({ error: "Missing data" }, { status: 400 });
    }

    const version = await Version.create({
      fileId,
      content,
      userId: null, // we add real user later
    });

    return Response.json(version);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}


