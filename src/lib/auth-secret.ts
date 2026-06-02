/** Runtime auth secret check (do not capture at module init for NextAuth config). */
export function resolveAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

export function hasAuthSecretConfigured(): boolean {
  return resolveAuthSecret().length >= 16;
}
