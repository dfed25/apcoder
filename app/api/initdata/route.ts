import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { promises as fs } from 'fs';
import * as path from 'path';

interface FREntry {
  year: number;
  description: string;
  path: string;
  rubric: string | null;
}

async function enumeratePdfDirectory(baseDir: string): Promise<FREntry[]> {
  const results: FREntry[] = [];
  
  try {
    // Read the years directories (2022, 2023, 2024)
    const years = await fs.readdir(path.join(baseDir, 'pdf'));
    
    for (const year of years) {
      // Skip if not a directory or doesn't match year pattern
      if (!/^\d{4}$/.test(year)) continue;
      
      // Read the FR directories within each year
      const frDirs = await fs.readdir(path.join(baseDir, 'pdf', year));
      
      for (const frDir of frDirs) {
        // Skip if not a directory or doesn't match FR pattern
        if (!frDir.startsWith('FR ')) continue;
        
        try {
          // Read the contents of each FR directory
          const files = await fs.readdir(path.join(baseDir, 'pdf', year, frDir));
          
          // Find the Question PDF and Rubric files
          const questionFile = files.find(f => f.startsWith('Question') && f.endsWith('.pdf'));
          const rubricFile = files.find(f => f.startsWith('Rubric') && f.endsWith('.docx'));
          
          if (questionFile) {
            results.push({
              year: parseInt(year),
              description: frDir,
              path: `/pdf/${year}/${frDir}/${questionFile}`,
              rubric: rubricFile ? `/pdf/${year}/${frDir}/${rubricFile}` : null
            });
          }
        } catch (err) {
          console.error(`Error processing directory ${frDir}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error reading pdf directory:', err);
    throw err;
  }
  
  // Sort by year and description
  return results.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.description.localeCompare(b.description);
  });
}


export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
   
      const supabase = createRouteHandlerClient({ cookies });
  
   const data = await enumeratePdfDirectory(path.join(process.cwd(), 'public'));
   for (const item of data) {
    try {
       let result = await supabase.from('questions').insert({
            year: item.year,
            description: item.description,
            path: item.path,
            rubric: item.rubric
        });
        console.log(result);
    } catch (error) {
        console.error('Error inserting data:', error);
    }
   }

  return NextResponse.json(data);
}