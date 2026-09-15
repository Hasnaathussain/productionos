export async function GET() {
  return Response.json({ documents: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ document: body });
}
