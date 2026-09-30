import { NextResponse } from 'next/server';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const { folderUrl } = await req.json();
    if (!folderUrl) return NextResponse.json({ error: 'Folder URL is required' }, { status: 400 });

    const folderId = extractFolderId(folderUrl);
    if (!folderId) return NextResponse.json({ error: 'Invalid Google Drive Folder URL. Must contain /folders/ID or ?id=ID' }, { status: 400 });

    const config = await getGoogleDriveConfig();
    let authHeader = '';

    if (config.enabled && config.credentials) {
      const token = await getAccessToken(config.credentials);
      authHeader = `Bearer ${token}`;
    } else if (process.env.GOOGLE_API_KEY) {
      // Fallback to API Key for public folders if configured
      authHeader = ``;
    } else {
      return NextResponse.json({ 
        error: 'Google Drive is not configured. Please configure a Service Account in the Backups settings.' 
      }, { status: 400 });
    }

    const authQuery = authHeader ? '' : `&key=${process.env.GOOGLE_API_KEY}`;
    const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    // 1. Fetch child folders (chapters)
    const foldersRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&pageSize=1000${authQuery}`, { headers });
    
    if (!foldersRes.ok) {
       const err = await foldersRes.text();
       console.error("Google Drive Scan Error:", err);
       return NextResponse.json({ error: `Unable to access this Google Drive folder. Check Google Drive connection and folder permissions.` }, { status: 400 });
    }
    
    const foldersData = await foldersRes.json();
    const chapters = foldersData.files || [];

    // Extract chapter numbers
    const chapterData = chapters.map((c: any) => {
       const num = parseChapterNumber(c.name);
       return { id: c.id, name: c.name, number: num };
    });
    
    // Sort chapters by number naturally
    chapterData.sort((a: any, b: any) => {
       if (a.number !== null && b.number !== null) return a.number - b.number;
       return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 2. Fetch files for each chapter folder
    const results = [];
    for (const chap of chapterData) {
       const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${chap.id}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType)&pageSize=1000${authQuery}`, { headers });
       if (filesRes.ok) {
          const filesData = await filesRes.json();
          let images = filesData.files || [];
          
          // filter for images
          images = images.filter((f: any) => /\.(jpe?g|png|webp|gif)$/i.test(f.name) || f.mimeType.startsWith('image/'));
          
          // sort images naturally
          images.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
          
          results.push({
             ...chap,
             images: images.map((i: any) => ({ id: i.id, name: i.name, mimeType: i.mimeType }))
          });
       }
    }

    return NextResponse.json({ success: true, chapters: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function extractFolderId(url: string) {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const params = new URLSearchParams(url.split('?')[1]);
  return params.get('id');
}

function parseChapterNumber(name: string): number | null {
  const regex = /(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i;
  const match = name.match(regex);
  if (match) return parseFloat(match[1]);
  
  const numMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  
  return null;
}
