import { cookies } from "next/headers";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();   // ⭐ THIS WAS WRONG BEFORE
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json(null);
    }

    const session = getSession(token);
    return Response.json(session);

  } catch (err) {
    console.error("ME API ERROR:", err);
    return Response.json(null);
  }
}
