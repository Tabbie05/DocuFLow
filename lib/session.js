import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "docuflowsecret";

export function createSession(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

export function getSession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
