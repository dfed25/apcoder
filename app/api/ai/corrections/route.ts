import OpenAI from 'openai';

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const code = formData.get('code') as string;
    const message = formData.get('message') as string;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful programming assistant. When suggesting code corrections, explain what changes were made and why they improve the code."
        },
        {
          role: "user",
          content: `${message}\n\nHere's the code:\n${code}`
        }
      ]
    });

    const response = completion.choices[0].message.content;
    return Response.json({ content: response });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}; 