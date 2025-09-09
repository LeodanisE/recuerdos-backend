// lib/paypal.ts
export async function getPaypalToken(): Promise<string> {
  const cid  = process.env.PAYPAL_CLIENT_ID?.trim();
  const csec = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const base = (process.env.PAYPAL_BASE || process.env.PAYPAL_API_BASE || "").trim();

  if (!cid || !csec || !base) {
    throw new Error("Missing PAYPAL envs");
  }

  const basic = Buffer.from(`${cid}:${csec}`).toString("base64");

  const params = new URLSearchParams();
  params.set("grant_type", "client_credentials");

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "Accept-Language": "en_US",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PayPal token error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}