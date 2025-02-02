import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const code = formData.get('code') as string;
    const previousGrade = formData.get('previousGrade') as string;
    const filePath = formData.get('filePath') as string;
    const serverPath = formData.get('serverPath') as string;

    // Fetch and process the rubric file
    const rubric = encodeURIComponent(filePath);
    const pdfResponse = await fetch(`${serverPath}/${rubric}`);
    const fileBuffer = await pdfResponse.arrayBuffer();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a temporary file
    const fileExtension = filePath.split('.').pop() || 'pdf';
    const tempFilePath = path.join(process.cwd(), `temp.${fileExtension}`);
    await fs.promises.writeFile(tempFilePath, Buffer.from(fileBuffer));

    // Upload file to OpenAI
    const fileUploadResponse = await openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: 'assistants',
    });

    // Clean up temp file
    await fs.promises.unlink(tempFilePath);

    const thread = await openai.beta.threads.create();
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Based on this grading result:\n${previousGrade}\n\nPlease provide the complete corrected version of this code:\n${code}\n\nInclude inline comments (using // or /* */) next to each change explaining why the modification was made to address specific points from the grading rubric. Start your response with a brief summary of the changes. Consult the rubric to make the changes necessary to address the points lost. only make changes that a AP Computer Science A student would know how to make within the AP Computer Science A curriculum. If there are no changes needed to gain points on the rubric from a specific part of the code please just leave it as it is. ONly comment on lines of code that need to be changed to gain points on the rubric.`,
      attachments: [
        { "file_id": fileUploadResponse.id, "tools": [{"type": "file_search"}] }
      ],
    });

    const assistant = await openai.beta.assistants.create({
      name: "Code Correction Assistant",
      instructions: "You are an assistant that helps correct student solutions based on a provided rubric and previous grading feedback.",
      model: "gpt-4-turbo-preview",
      tools: [{ type: "file_search" }]
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantResponse = messages.data[0].content[0];

    // Clean up
    await openai.files.del(fileUploadResponse.id);
    await openai.beta.threads.del(thread.id);
    await openai.beta.assistants.del(assistant.id);

    if (assistantResponse.type === 'text') {
      return Response.json({ content: assistantResponse.text.value });
    } else {
      return Response.json({ content: assistantResponse.image_file.url });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

