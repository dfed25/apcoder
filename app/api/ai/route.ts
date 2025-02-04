
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const filePath = formData.get('filePath') as string;
    //const serverPath = formData.get('serverPath') as string;
   // const id = formData.get('id') as string;
    const openAiFileId = formData.get('openAiFileId') as string;

    const code = formData.get('code') as string;
    // Convert PDF to base64
    /*
    const rubric = encodeURIComponent(filePath)
    console.log(`${serverPath}/${rubric}`);
    const pdfResponse = await fetch(`${serverPath}/${rubric}`);
    // Download the file content
    const fileBuffer = await pdfResponse.arrayBuffer();
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a temporary file with the original file extension
    const fileExtension = filePath.split('.').pop() || 'pdf';
    const tempFilePath = path.join("/tmp", `temp.${fileExtension}`);
    await fs.promises.writeFile(tempFilePath, Buffer.from(fileBuffer));

    // Upload the file to OpenAI using the file path
    const fileUploadResponse = await openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: 'assistants',
    });

    // Clean up the temporary file
    await fs.promises.unlink(tempFilePath);

    const fileId = fileUploadResponse.id;
    */
    const fileId = openAiFileId;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const thread = await openai.beta.threads.create();
  
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Use the rubric document attached to score the java code for the student solution. Create a detailed grading table with the following format:

Requirements:
1. Each rubric criterion should be a separate row
2. Left column must show points as "X/1" format. You either get 1 point or 0 points.
3. Right column should contain detailed justification
4. Include a final row that shows gained points/total points
5. Use proper Markdown syntax with aligned columns for tables
6. do not cite the rubric, just use it to grade the code
7. make sure to go through every item in the rubric and grade the code accordingly
8. make sure the code as a whole runs as the rubric requires
9. check for syntax errors and logic errors 
10. only use the rubric attahced named ${filePath}

The table should start with the following format:
| Points | Justification |
|--------|---------------|


Here is the java code:
<code>
${code}
</code>


`,
      "attachments": [
        { "file_id": fileId, "tools": [{"type": "file_search"}] }
      ],
    });
    const assistant = await openai.beta.assistants.create({
      name: "Grading Assistant",
      instructions: "You are an assistant that helps grade student AP Computer Science java code solutions based on a provided rubric. You put the grading table in proper markdown format. No need to cite the rubric, just use it to grade the code. only use the rubric attached to the thread to grade the code.",
      model: "gpt-4o-2024-08-06",
      temperature: 0,
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

    // Clean up
    //await openai.files.del(fileId);
    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantResponse = messages.data[0].content[0];
    console.log(assistantResponse);

    // Clean up
    await openai.beta.threads.del(thread.id);
    await openai.beta.assistants.del(assistant.id);
    if (assistantResponse.type === 'text') {
      return Response.json({ content: assistantResponse.text.value });
    } else if (assistantResponse.type === 'image_url') {
      return Response.json({ content: assistantResponse.image_url.url });
    } else if (assistantResponse.type === 'image_file') {
      return Response.json({ content: assistantResponse.image_file.file_id });
    } else {
      return Response.json({ content: 'Unsupported response type' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function corrections(request: Request) {
  try {
    const formData = await request.formData();
    const code = formData.get('code') as string;
    const previousGrade = formData.get('previousGrade') as string;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a helpful programming assistant. Provide the complete corrected code with inline comments explaining each change. Format your response in markdown with the corrected code in a code block, and include a brief summary of changes at the top."
        },
        {
          role: "user",
          content: `Based on this grading result:\n${previousGrade}\n\n
                    Please provide the complete corrected version of this code:\n${code}\n
                    Include inline comments (using // or /* */) next to each change explaining why the modification was made to address specific points from the grading rubric.
                     Start your response with a brief summary of the changes. consult the rubric to make the changes necessary to address the points lost.
                     put the corrected code in a code block.
                     `
          
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
}
