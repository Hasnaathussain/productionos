import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const allowedTools = ["search"];
const permissionPolicy = { allowedTools, readOnly: true };
const tools = { search: { description: "Search only", execute: async () => ({ ok: true }) } };

export async function POST(request: Request) {
  const body = await request.json() as { prompt: string };
  const response = await client.responses.create({ model: "gpt-4o-mini", input: body.prompt, tools, metadata: permissionPolicy });
  return Response.json(response);
}
