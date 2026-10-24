// Reads a required server secret. Throws with the key name only, never the
// value, so error text stays safe to log.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
