import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { ChangeEmailForm } from "@/components/settings/change-email-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function SettingsPage() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account email and password.
        </p>
      </div>

      <ChangeEmailForm currentEmail={user.email} />
      <ChangePasswordForm />
    </div>
  );
}
