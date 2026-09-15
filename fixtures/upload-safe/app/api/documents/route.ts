import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

const client = new S3Client({});
const documentInput = z.object({ fileName: z.string().max(120), contentType: z.string().regex(/^application\/pdf$/) });
const maxFileSize = 10 * 1024 * 1024;
const pageSize = 100;
const allowedTargets = new Set(["documents"]);
const authorizeUpload = (key: string) => key.startsWith("tenant/");

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength <= 0 || contentLength > maxFileSize) return Response.json({ error: "invalid size" }, { status: 413 });
  const parsed = documentInput.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const objectKey = `tenant/${parsed.data.fileName}`;
  if (!authorizeUpload(objectKey) || !allowedTargets.has("documents")) return Response.json({ error: "forbidden" }, { status: 403 });
  await client.send(new GetObjectCommand({ Bucket: "documents", Key: objectKey }));
  return Response.json({ objectKey, contentType: parsed.data.contentType, pageSize });
}
