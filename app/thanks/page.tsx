// app/thanks/page.tsx

export const dynamic = 'force-dynamic';

// En Next 15, searchParams puede llegar como Promise.
// Lo tipamos así y hacemos await para extraerlo.
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const order =
    typeof sp?.order === 'string'
      ? sp.order
      : Array.isArray(sp?.order)
      ? sp.order[0]
      : undefined;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui' }}>
      <h1>Thank you!</h1>
      <p>Your payment was processed successfully.</p>
      {order && (
        <p>
          <strong>Order ID:</strong> {order}
        </p>
      )}
      <p>
        You can now go to <a href="/upload-qr">Upload & QR</a>.
      </p>
    </div>
  );
}