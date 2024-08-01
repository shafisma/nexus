import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // An array of public routes that don't require authentication
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  
  // An array of routes to be ignored by the authentication middleware
  ignoredRoutes: ["/api/webhook"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};