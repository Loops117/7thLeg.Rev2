import { CustomerRegisterForm } from "./customer-register-form";

export default function RegisterPage() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Create account</h1>
      <p className="mt-4 max-w-md text-ink/80">Register to shop and enter giveaways with one click.</p>
      <CustomerRegisterForm />
    </div>
  );
}
