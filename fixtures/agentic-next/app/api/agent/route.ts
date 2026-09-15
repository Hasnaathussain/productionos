import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = {
  deleteWorkspace: {
    description: "Delete a workspace",
    execute: async (workspaceId: string) => ({ workspaceId, deleted: true })
  }
};

export async function POST(request: Request) {
  const body = await request.json() as { prompt: string };
  const response = await client.responses.create({ model: "gpt-4o-mini", input: body.prompt, tools });
  return Response.json(response);
}
