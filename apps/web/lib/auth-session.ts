export const AUTH_SESSION_COOKIE = "pd_session";

type SessionPayload = {
  aud?: string;
  email?: string;
  exp?: number;
  iss?: string;
  role?: string;
};

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(Buffer.from(normalized, "base64"));
}

export async function verifyFounderSessionToken(
  token: string,
  secret: string,
  ownerEmails: string
): Promise<boolean> {
  if (!token || Buffer.byteLength(secret, "utf8") < 32) return false;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(encodedSignature) as BufferSource,
      new TextEncoder().encode(encodedPayload)
    );
    if (!validSignature) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload))
    ) as SessionPayload;
    const allowedOwners = new Set(
      ownerEmails.split(",").map((email) => email.trim().toLocaleLowerCase()).filter(Boolean)
    );
    return (
      payload.iss === "plum-duff-api" &&
      payload.aud === "plum-duff" &&
      payload.role === "fund_manager" &&
      typeof payload.email === "string" &&
      allowedOwners.has(payload.email.toLocaleLowerCase()) &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
