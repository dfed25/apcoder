"use client";
import dynamic from 'next/dynamic';
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';

// Dynamically import PDF components with ssr disabled
const PDFDocument = dynamic(() => import('react-pdf').then(mod => mod.Document), {
  ssr: false
});

const PDFPage = dynamic(() => import('react-pdf').then(mod => mod.Page), {
  ssr: false
});

// Move this to a useEffect
const setPDFWorker = async () => {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
};

export default function Home() {
    const years = Array.from({ length: 3 }, (_, i) => 2002 + i);

    const questionsByYear: { [key: number]: any[] } = {
      2002: [{description:"Question #1", path:"/pdf/2022/FR 2022 #1 (Game)/Question 2022 #1 (Game).pdf"}, {description:"Question #2", path:"/pdf/2022/FR 2022 #2 (Textbook)/Question 2022 #2 (Textbook).pdf"}],
      2003: [{description:"Question #1", path:"/pdf/2022/FR 2022 #1 (Game)/Question 2022 #1 (Game).pdf"}, {description:"Question #2", path:"/pdf/2022/FR 2022 #2 (Textbook)/Question 2022 #2 (Textbook).pdf"}],
      2004: [{description:"Question #1", path:"/pdf/2022/FR 2022 #1 (Game)/Question 2022 #1 (Game).pdf"}, {description:"Question #2", path:"/pdf/2022/FR 2022 #2 (Textbook)/Question 2022 #2 (Textbook).pdf"}],
      2024: [{description:"Question #1", path:"/pdf/2022/FR 2022 #1 (Game)/Question 2022 #1 (Game).pdf"}, {description:"Question #2", path:"/pdf/2022/FR 2022 #2 (Textbook)/Question 2022 #2 (Textbook).pdf"}],
    };
  
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [questions, setQuestions] = useState<any[]>(questionsByYear[2002] || []);
    const [selectedQuestion, setSelectedQuestion] = useState<string>("");
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [code, setCode] = useState(
      `function add(a, b) {\n  return a + b;\n}`
    );
  
    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
      setNumPages(numPages);
    }
  
    
    const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const year = parseInt(event.target.value);
      setSelectedYear(year.toString());
      setQuestions(questionsByYear[year] || [{}]);
      setSelectedQuestion("");
    };
  
    const handleQuestionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedQuestion(event.target.value);
    };
  
  // Set up PDF worker
  useEffect(() => {
    setPDFWorker();
  }, []);

  // ... rest of your component code, but replace Document with PDFDocument and Page with PDFPage

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex space-x-4">
        <select
          className="border border-gray-300 rounded-md p-2"
          value={selectedYear}
          onChange={handleYearChange}
        >
          <option value="" disabled>
            Select a year
          </option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 rounded-md p-2"
          value={selectedQuestion}
          onChange={handleQuestionChange}
          disabled={!selectedYear || !questions.length}
        >
          <option value="" disabled>
            Select a question
          </option>
          {questions.map((question, index) => (
            <option key={index} value={question.path}>
              {question.description}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col space-y-4">
        <ScrollArea 
          className="border-4 border-gray-500 p-4"
          style={{ maxHeight: '60vh', width: '80vw', overflow: 'auto' }}
        >
           <ScrollBar orientation="horizontal" />
             <PDFDocument 
              file={selectedQuestion ? encodeURIComponent(selectedQuestion) : undefined} 
              onLoadSuccess={onDocumentLoadSuccess}
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_container_${index + 1}`} className="mb-4 last:mb-0">
                  <PDFPage key={`page_${index + 1}`} pageNumber={index + 1} scale={1.5} />
                  {numPages && index < numPages - 1 && <hr className="border-t-2 border-gray-300 my-4" />}
                </div>
              ))}
            </PDFDocument>
           
        </ScrollArea>
        <ScrollArea 
          className="border-4 border-gray-500 p-4"
          style={{ maxHeight: '80vh', width: '80vw', overflow: 'auto' }}
        >
          <Editor
            value={code}
            onValueChange={code => setCode(code)}
            highlight={code => highlight(code, languages.js)}
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 12,
            }}
          />
           <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

