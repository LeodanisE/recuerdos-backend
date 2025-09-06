"use client";
import * as React from "react";
import Script from "next/script";

export default function PricingPage() {
  const [ready, setReady] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!ready) return;
    const paypal = (window as any).paypal;
    if (!paypal) return;

    try {
      paypal
        .Buttons({
          style: { layout: "vertical", shape: "pill", label: "paypal" },
          createOrder: (_data: any, actions: any) =>
            actions.order.create({
              purchase_units: [
                {
                  description: "Forever Link (one-time)",
                  amount: { value: "9.00" }, // cambia el precio si quieres
                },
              ],
            }),
          onApprove: async (_data: any, actions: any) => {
            const details = await actions.order.capture();
            const id = details?.id || "";
            window.location.href = `/thanks?order=${encodeURIComponent(id)}`;
          },
          onError: () => setErr("Payment failed, please try again."),
        })
        .render("#paypal-button-container");
    } catch {
      setErr("PayPal failed to initialize.");
    }
  }, [ready]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 640 }}>
      <h1>Pricing</h1>
      <p style={{ color: "#555", marginBottom: 12 }}>
        Pay once. Get a QR that redirects to your file. No subscription.
      </p>

      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Forever Link</div>
        <div style={{ color: "#666", marginBottom: 12 }}>One-time purchase</div>
        <div id="paypal-button-container" />
        {err && <p style={{ color: "red", marginTop: 10 }}>{err}</p>}
      </div>

      <p style={{ marginTop: 10, color: "#777", fontSize: 13 }}>
        Sandbox: use a <b>PayPal sandbox buyer</b> (email/password) from your developer dashboard.
      </p>
    </div>
  );
}