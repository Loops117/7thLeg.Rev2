import { Suspense } from "react";
import { CustomerLoginForm } from "./customer-login-form";

export default function LoginPage() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Customer login</h1>
      <p className="mt-4 max-w-md text-ink/80">
        Sign in with your store account to use your email automatically on giveaway sign-ups.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-ink/60">Loading…</p>}>
        <CustomerLoginForm />
      </Suspense>
    </div>
  );
}
