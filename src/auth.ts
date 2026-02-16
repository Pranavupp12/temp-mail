// src/auth.ts
import NextAuth from "next-auth";
import { authConfig } from "../auth.config"; // Import your config from root
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (
          credentials?.username === "admin" && 
          credentials?.password === "admin123"
        ) {
          return { id: "1", name: "Admin" };
        }
        return null;
      },
    }),
  ],
});