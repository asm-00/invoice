import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email =
          typeof params.email === "string"
            ? params.email.trim().toLowerCase()
            : "";
        const name =
          typeof params.name === "string" ? params.name.trim() : undefined;

        if (!email) {
          throw new Error("Email is required");
        }

        return {
          email,
          name: name || email.split("@")[0],
        };
      },
    }),
  ],
});
