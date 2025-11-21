// app/dashboard/profile/page.tsx

import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./_components/profile-form";
import { PreviewToggle } from "./_components/preview-toggle";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">
          Unable to load user profile. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-xs text-slate-600">
          Manage your account information and privacy settings.
        </p>
      </header>

      {/* Profile Card */}
      <section className="mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">Profile</h2>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email is managed by your authentication provider and cannot be
              changed here.
            </p>
          </div>
          <ProfileForm
            initialFirstName={user.firstName}
            initialLastName={user.lastName}
          />
        </div>
      </section>

      {/* Privacy & Logs Card */}
      <section>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">
            Privacy & Logs
          </h2>
          <PreviewToggle
            initialValue={user.allowInputPreview}
            label="Show input text in logs"
          />
          <p className="mt-3 text-xs text-slate-600">
            When enabled, CleanMod will display a truncated preview of moderated
            input text in your dashboard logs. The full text is still stored in
            the database. When disabled, only hashed values will be shown in the
            logs UI.
          </p>
        </div>
      </section>
    </div>
  );
}
