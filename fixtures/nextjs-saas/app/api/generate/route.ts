import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();
  const response = await client.responses.create({ model: "gpt-4o-mini", input: body.prompt });
  return Response.json(response);
}
