import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client that reads auth session from cookies.
 * Use in API routes and server components to get the current user.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user ID.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
