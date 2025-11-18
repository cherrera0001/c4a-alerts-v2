import jwt from "jsonwebtoken";
import { authConfig } from "../config/env.js";

export function signToken(payload) {
  return jwt.sign(payload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, authConfig.jwtSecret);
}
