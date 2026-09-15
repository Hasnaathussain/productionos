export async function GET() {
  const response = await fetch(process.env.UPSTREAM_URL as string);
  return Response.json(await response.json());
}
