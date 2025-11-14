import { NextResponse } from 'next/server' // 👈 Import NextResponse
import fs from 'fs'
import path from 'path'

// Define the question data structure
interface Question {
  question_id: string;
  question: string;
  options: { [key: string]: string };
  correct_answer: string;
  difficulty: string;
}

// 👇 Must use "export async function GET"
export async function GET(request: Request) { 
  
  // 👇 Get URL query parameters (e.g., ?difficulty=easy)
  const { searchParams } = new URL(request.url)
  const difficulty = searchParams.get('difficulty')

  // Validate difficulty parameter
  if (!difficulty || !['easy', 'normal', 'medium', 'hard'].includes(difficulty)) {
    // 👇 Use NextResponse to return error
    return NextResponse.json({ error: 'Invalid or missing difficulty level' }, { status: 400 });
  }
  
  let questionsData: Question[];

  try {
    // This part of the file reading logic remains unchanged
    // ⚠️ Double check that your JSON file name is 'questions.json'
    const filePath = path.join(process.cwd(), 'public', 'questions.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    questionsData = JSON.parse(fileContents) as Question[];
    
  } catch (error) {
    console.error('Error reading questions file:', error);
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
         return NextResponse.json({ error: 'Failed to load questions data. Make sure "questions.json" is in the /public folder.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to load questions data.' }, { status: 500 });
  }

  // Filter questions (same as before)
  const filteredQuestions = questionsData.filter(
    q => q.difficulty === difficulty
  );

  if (filteredQuestions.length === 0) {
    // 👇 Use NextResponse to return error
    return NextResponse.json({ error: `No questions found for difficulty: ${difficulty}` }, { status: 404 });
  }

  // Randomly select one (same as before)
  const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
  const randomQuestion = filteredQuestions[randomIndex];

  // 👇 Use NextResponse to return successful data
  return NextResponse.json(randomQuestion, { status: 200 });
}