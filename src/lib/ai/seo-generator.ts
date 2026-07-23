import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateSeoMetadata(
  type: 'series' | 'chapter',
  context: {
    title: string;
    seriesTitle?: string;
    synopsis?: string;
    chapterNumber?: number | null;
  }
): Promise<{ title: string; description: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an expert SEO specialist for a manhwa/manga reading platform.
    Generate a highly optimized SEO title and meta description.

    Format the response as valid JSON:
    {
      "title": "SEO Title here",
      "description": "Meta description here"
    }

    Rules:
    - title must be under 60 characters and highly clickable (include terms like "Read", "Manhwa", "Chapter").
    - description must be under 160 characters and provide an enticing summary to increase CTR.
    - DO NOT use markdown code blocks (\`\`\`json) in your output, just return the raw JSON object.
    
    Context:
    Type: ${type}
    ${type === 'series' ? `Series Title: ${context.title}\nSynopsis: ${context.synopsis || 'A great manhwa series.'}` : ''}
    ${type === 'chapter' ? `Chapter: ${context.chapterNumber ? `Chapter ${context.chapterNumber}` : context.title}\nSeries: ${context.seriesTitle}` : ''}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Failed to generate SEO metadata:', error);
    throw new Error('Failed to generate SEO metadata via AI');
  }
}
