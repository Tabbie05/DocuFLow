import connectDB from '../../../../lib/dbConfig';
import User from '../../../../models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSession } from "@/lib/session";

export async function POST(req) {
  await connectDB();

  try {
    const { username, password } = await req.json();

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
    }

    // ⭐ CREATE SESSION TOKEN
    const token = createSession(user);

    const response = NextResponse.json({ user }, { status: 200 });

    // ⭐ SAVE COOKIE
    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

