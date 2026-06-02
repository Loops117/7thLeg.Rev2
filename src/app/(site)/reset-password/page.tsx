import { ResetPasswordForm } from "./reset-password-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Set a new password</h1>
      <p className="mt-4 max-w-md text-ink/80">Choose a new password for your account.</p>
      <ResetPasswordForm token={raw} />
    </div>
  );
}
