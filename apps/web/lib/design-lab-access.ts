export function designLabAllowed(input: {
  host: string | null;
  enabled: string | undefined;
  nodeEnv: string | undefined;
  vercel: string | undefined;
}): boolean {
  const host = input.host?.split(":")[0]?.toLowerCase();
  return input.nodeEnv !== "production" && !input.vercel && input.enabled === "true"
    && (host === "localhost" || host === "127.0.0.1");
}
