"use server";

/*
  Server actions for the Nova developer portal.

  Server actions, not route handlers, because Next checks the Origin header on
  every action POST against the host — CSRF protection for free, which a
  hand-written /api route would have to reimplement.

  Every export here is a PUBLIC endpoint. So each one: (1) treats its
  arguments as untrusted, (2) derives identity from the session cookie, never
  from an argument, and (3) catches infrastructure errors, logs the detail
  server-side and returns a generic message.
*/

// Re-renders the dashboard's server component after a key changes.
import { revalidatePath } from "next/cache";
// Sends the browser back to the sign-in screen after sign-out.
import { redirect } from "next/navigation";

// Sign-in primitives; they do the validation, throttling and scrypt.
import { getPortalUser, signIn, signOut, type PortalResult } from "@/lib/nova/portalAuth";
// Key queries that must only ever run for the session's own email.
// "(portal)" is a route group: it shapes the folder tree, never the URL.
import { createKey, revokeKey, type CreateKeyResult } from "./(portal)/dashboard/keys";

// One message for every unexpected failure, so no internal detail leaks.
const GENERIC_ERROR = "Something went wrong. Please try again in a minute.";
// Shown when an action runs without a live session (expired, signed out elsewhere).
const SIGNED_OUT = "Your session has ended. Sign in again.";

// Email + password → session cookie (set inside signIn on success).
export async function signInAction(email: string, password: string): Promise<PortalResult> {
  try {
    // Throttling, scrypt and the generic message all live in signIn.
    return await signIn(email, password);
  } catch (error) {
    // DB down — the same for every email, so a generic message leaks nothing.
    console.error("[nova/actions] signIn failed:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// Used as a <form action>; the FormData it receives is ignored.
export async function signOutAction(): Promise<void> {
  // signOut never throws; it clears the cookie even if the row delete fails.
  await signOut();
  // Drop any cached render of the signed-in pages.
  revalidatePath("/nova-api", "layout");
  // Explicit, so sign-out lands on the sign-in screen from wherever it was clicked.
  redirect("/nova-api");
}

// Creates a key for the signed-in user; the plaintext is returned exactly once.
export async function createKeyAction(name: string): Promise<CreateKeyResult> {
  try {
    // Re-checked here: the page's check does not protect a direct action POST.
    const user = await getPortalUser();
    if (!user) return { ok: false, message: SIGNED_OUT };
    // Email comes from the session, never from the client.
    const result = await createKey(user.email, name);
    // Only re-render when something changed.
    if (result.ok) revalidatePath("/nova-api/dashboard");
    return result;
  } catch (error) {
    // e.g. DB down, or apiKeys.ts failing — detail stays server-side.
    console.error("[nova/actions] createKey failed:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// Revokes one of the signed-in user's keys.
export async function revokeKeyAction(id: string): Promise<PortalResult> {
  try {
    // Same re-check as createKeyAction, for the same reason.
    const user = await getPortalUser();
    if (!user) return { ok: false, message: SIGNED_OUT };
    // revokeKey filters by id AND this email, so another user's id is a no-op.
    const revoked = await revokeKey(user.email, id);
    // Refresh the list whether or not it matched, so the UI shows the truth.
    revalidatePath("/nova-api/dashboard");
    return revoked
      ? { ok: true, message: "Key revoked. Requests using it now get 401." }
      : { ok: false, message: "That key was not found or is already revoked." };
  } catch (error) {
    // Logged in full; generic to the user.
    console.error("[nova/actions] revokeKey failed:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
