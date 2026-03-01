import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "../../../lib/supabase";

/**
 * POST /api/master-password
 * Set up or verify the master password.
 *
 * Body: { action: "setup" | "verify", password: string, hint?: string }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, password, hint } = await req.json();

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();

  if (action === "setup") {
    // Check if user already has a master password
    const { data: existing } = await supabase
      .from("user_keys")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Master password already set. Use 'verify' action." },
        { status: 409 }
      );
    }

    // Hash the master password (server-side verification only)
    const hash = await bcrypt.hash(password, 12);

    // Store the hash — the client will handle vault key creation
    const { error } = await supabase.from("user_keys").insert({
      user_id: userId,
      master_password_hash: hash,
      password_hint: hint || null,
      // encrypted_vault_key, key_salt will be set by the client
      // after deriving the key and encrypting the vault key
      encrypted_vault_key: null,
      key_salt: null,
      key_iterations: 600000,
    });

    if (error) {
      console.error("Failed to setup master password:", error);
      return NextResponse.json(
        { error: "Failed to save master password" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isNewUser: true });
  }

  if (action === "verify") {
    // Get stored hash
    const { data: userKeys, error } = await supabase
      .from("user_keys")
      .select("master_password_hash, encrypted_vault_key, key_salt, key_iterations, password_hint")
      .eq("user_id", userId)
      .single();

    if (error || !userKeys) {
      return NextResponse.json(
        { error: "No master password set", needsSetup: true },
        { status: 404 }
      );
    }

    // Verify
    const isValid = await bcrypt.compare(
      password,
      userKeys.master_password_hash
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect master password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      encrypted_vault_key: userKeys.encrypted_vault_key,
      key_salt: userKeys.key_salt,
      key_iterations: userKeys.key_iterations,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * PUT /api/master-password
 * Update the vault key material after client-side key derivation.
 *
 * Body: { encrypted_vault_key: EncryptedField, key_salt: string }
 */
export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { encrypted_vault_key, key_salt } = await req.json();

  if (!encrypted_vault_key || !key_salt) {
    return NextResponse.json(
      { error: "Missing vault key material" },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();

  const { error } = await supabase
    .from("user_keys")
    .update({
      encrypted_vault_key,
      key_salt,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update vault key:", error);
    return NextResponse.json(
      { error: "Failed to save vault key" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
