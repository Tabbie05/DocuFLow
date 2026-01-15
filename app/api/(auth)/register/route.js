
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // or bcrypt
import connectDB from "../../../../lib/dbConfig";
import User from "../../../../models/User";

export async function POST(req) {
  await connectDB();
  try {
    const { username, email, password } = await req.json();

    console.log("Register payload:", { username, email, password }); // <- Check this

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return NextResponse.json({ message: "Username or email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({ username, email, password: hashedPassword });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error); // <- See exact error here
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
