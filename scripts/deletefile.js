import { createClient } from '@supabase/supabase-js'
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 
import OpenAI from 'openai';

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async function deleteFiles() {
    for (let i = 0; i < data.length; i++) {
    const file = data[i];
    console.log(file.id);
    await openai.files.del(file.id);
  }
}


async function updateOpenaiFiles() {
  const {data:files,error} = await supabase.from('questions').select('*').eq('id',39);


  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.rubric) {
        let filepath = "/Users/marcellofederico/Projects/apcoder/apcoder/public"+file.rubric;
        console.log(file.id,filepath);
        await getOpenAiFileId(filepath,file.id);
    }
}
return true
}
async function getOpenAiFileId(filePath,id) {
   
    
    // Upload the file to OpenAI using the file path
    const fileUploadResponse = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants',
    });
   
    console.log(fileUploadResponse.id);
    const { data, error } = await supabase
  .from('questions')
  .update({ open_ai_file_id: fileUploadResponse.id })
  .eq('id', id);

  console.log(data);
if (error) {
  console.error('Error updating question:', error);
  return;
}
}
async function main() {
await updateOpenaiFiles();
}
main();