const PART_SIZE = 8 * 1024 * 1024; // 8 MB
const CONCURRENCY = 6;

type ProgressCB = (p: { percent: number; uploadedBytes: number; totalBytes: number }) => void;

export async function uploadMultipartClient(file: File, key: string, onProgress?: ProgressCB) {
  const parts = Math.ceil(file.size / PART_SIZE);

  // 1) pedir URLs firmadas (init)
  const initRes = await fetch("/api/upload/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      contentType: file.type || "application/octet-stream",
      parts,
    }),
  });
  if (!initRes.ok) throw new Error("init_failed");
  const { uploadId, urls } = await initRes.json();

  // 2) subir partes en paralelo
  const etags: { ETag: string; PartNumber: number }[] = new Array(parts);
  let uploadedBytes = 0;
  let nextPart = 1;

  async function worker() {
    while (true) {
      const partNumber = nextPart++;
      if (partNumber > parts) break;

      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);
      const { url } = urls.find((u: any) => u.partNumber === partNumber)!;

      const res = await fetch(url, { method: "PUT", body: blob });
      if (!res.ok) throw new Error(`part_${partNumber}_failed_${res.status}`);

      const etag = (res.headers.get("ETag") || "").replaceAll('"', "");
      etags[partNumber - 1] = { ETag: etag, PartNumber: partNumber };

      uploadedBytes += blob.size;
      onProgress?.({
        percent: Math.min(100, Math.round((uploadedBytes / file.size) * 100)),
        uploadedBytes,
        totalBytes: file.size,
      });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 3) completar
  const completeRes = await fetch("/api/upload/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, uploadId, parts: etags }),
  });
  if (!completeRes.ok) throw new Error("complete_failed");
  return completeRes.json();
}