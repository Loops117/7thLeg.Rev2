import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Forgot password</h1>
      <p className="mt-4 max-w-md text-ink/80">
        Enter your email and we’ll send you a link to choose a new password (if an account exists).
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
