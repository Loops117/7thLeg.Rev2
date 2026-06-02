import Link from "next/link";
import { redirect } from "next/navigation";
import { auth as readAuthSession } from "@/auth";
import { btnMainMd } from "@/lib/btn-theme-classes";

export default async function AccountPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Your account</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>{" "}
          to manage your profile and saved cart.
        </p>
      </div>
    );
  }

  if (session.user.role === "admin") {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Admin</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          You’re signed in as a store administrator. Customer storefront features (cart, points) use a customer login.
        </p>
        <p className="mt-4">
          <Link
            href="/settings/sales"
            className={btnMainMd}
          >
            Open admin
          </Link>
        </p>
        <p className="mt-6 text-sm text-ink/65">
          The <code className="rounded bg-black/5 px-1">ADMIN_EMAIL</code> /{" "}
          <code className="rounded bg-black/5 px-1">ADMIN_PASSWORD</code> in{" "}
          <code className="rounded bg-black/5 px-1">.env</code> are only used when you run{" "}
          <code className="rounded bg-black/5 px-1">npm run db:seed</code> — they create or update the admin user in
          whatever database <code className="rounded bg-black/5 px-1">DATABASE_URL</code> points to (local or
          production). They are not read at runtime by the web app.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Your account</h1>
        <p className="mt-6 text-ink/80">Unsupported session type.</p>
      </div>
    );
  }

  redirect("/account/orders");
}
