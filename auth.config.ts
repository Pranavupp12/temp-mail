import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname === "/";
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If user is logged in and tries to go to /login, redirect to dashboard
        if (nextUrl.pathname === "/login") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }
      return true;
    },
  },
  providers: [], // Providers are configured in route.ts
} satisfies NextAuthConfig;