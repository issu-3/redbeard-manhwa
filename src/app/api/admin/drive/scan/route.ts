import { NextResponse } from 'next/server';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const { folderUrl, apiKey } = await req.json();
    if (!folderUrl) return NextResponse.json({ error: 'Folder URL is required' }, { status: 400 });

    const folderId = extractFolderId(folderUrl);
    if (!folderId) return NextResponse.json({ error: 'Invalid Google Drive Folder URL. Must contain /folders/ID or ?id=ID' }, { status: 400 });

    const config = await getGoogleDriveConfig();
    let authHeader = '';
    let finalApiKey = process.env.GOOGLE_API_KEY || apiKey;

    if (config.enabled && config.credentials) {
      const token = await getAccessToken(config.credentials);
      authHeader = `Bearer ${token}`;
    } else if (finalApiKey) {
      // Fallback to API Key for public folders if configured
      authHeader = ``;
    } else {
      return NextResponse.json({ 
        error: 'NEEDS_API_KEY' 
      }, { status: 400 });
    }

    const authQuery = authHeader ? '' : `&key=${finalApiKey}`;
    const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    // 1. Fetch parent folder metadata
    const parentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name${authQuery}`, { headers, cache: 'no-store' });
    let parentName = 'Unknown Folder';
    if (parentRes.ok) {
      const pData = await parentRes.json();
      if (pData.name) parentName = pData.name;
    }

    // 2. Fetch all files inside the provided folder
    const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=1000${authQuery}`, { headers, cache: 'no-store' });
    
    if (!filesRes.ok) {
       const err = await filesRes.text();
       console.error("Google Drive Scan Error:", err);
       return NextResponse.json({ error: `Unable to access this Google Drive folder. Check Google Drive connection and folder permissions.` }, { status: 400 });
    }
    
    const filesData = await filesRes.json();
    const allFiles = filesData.files || [];

    const subfolders = allFiles.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder');
    let directImages = allFiles.filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder' && (/\.(jpe?g|png|webp|gif)$/i.test(f.name) || f.mimeType.startsWith('image/')));
    const archives = allFiles.filter((f: any) => /\.(cbz|zip)$/i.test(f.name) || f.mimeType === 'application/zip' || f.mimeType === 'application/x-zip-compressed' || f.mimeType === 'application/vnd.comicbook+zip');
    const pdfs = allFiles.filter((f: any) => /\.pdf$/i.test(f.name) || f.mimeType === 'application/pdf');

    const results = [];

    // Case 1: Folder directly contains images (Single Chapter mode)
    if (directImages.length > 0) {
       directImages.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
       results.push({
          id: folderId,
          name: parentName,
          number: parseChapterNumber(parentName),
          images: directImages.map((i: any) => ({ id: i.id, name: i.name, mimeType: i.mimeType }))
       });
    }

    // Case 2: Folder contains archives (Bulk CBZ/ZIP mode)
    if (archives.length > 0) {
       archives.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
       for (const arc of archives) {
          results.push({
             id: arc.id,
             name: arc.name,
             number: parseChapterNumber(arc.name),
             images: [],
             isArchive: true
          });
       }
    }
    
    // Case 2b: Folder contains PDFs (Bulk PDF mode)
    if (pdfs.length > 0) {
       pdfs.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
       for (const pdf of pdfs) {
          results.push({
             id: pdf.id,
             name: pdf.name,
             number: parseChapterNumber(pdf.name),
             images: [{ id: pdf.id, name: pdf.name, mimeType: pdf.mimeType }]
          });
       }
    }

    // Case 3: Folder contains subfolders (Bulk Import mode)
    if (subfolders.length > 0) {
       const chapterData = subfolders.map((c: any) => ({ id: c.id, name: c.name, number: parseChapterNumber(c.name) }));
       
       chapterData.sort((a: any, b: any) => {
          if (a.number !== null && b.number !== null) return a.number - b.number;
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
       });

       for (const chap of chapterData) {
          try {
             const chapFilesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${chap.id}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType)&pageSize=1000${authQuery}`, { headers, cache: 'no-store' });
             if (chapFilesRes.ok) {
                const chapFilesData = await chapFilesRes.json();
                const chapFiles = chapFilesData.files || [];
                
                const chapArchives = chapFiles.filter((f: any) => /\.(cbz|zip)$/i.test(f.name) || f.mimeType === 'application/zip' || f.mimeType === 'application/x-zip-compressed' || f.mimeType === 'application/vnd.comicbook+zip');
                const chapPdfs = chapFiles.filter((f: any) => /\.pdf$/i.test(f.name) || f.mimeType === 'application/pdf');
                const chapImages = chapFiles.filter((f: any) => /\.(jpe?g|png|webp|gif)$/i.test(f.name) || f.mimeType.startsWith('image/'));

                // Prioritize Archives > PDFs > Direct Images to prevent duplicate chapters for the same folder
                if (chapArchives.length > 0) {
                  chapArchives.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                  results.push({
                    id: chapArchives[0].id,
                    name: chap.name,
                    number: chap.number,
                    images: [],
                    isArchive: true
                  });
                } else if (chapPdfs.length > 0) {
                  chapPdfs.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                  results.push({
                    id: chap.id,
                    name: chap.name,
                    number: chap.number,
                    images: [{ id: chapPdfs[0].id, name: chapPdfs[0].name, mimeType: chapPdfs[0].mimeType }]
                  });
                } else if (chapImages.length > 0) {
                  chapImages.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                  results.push({
                    ...chap,
                    images: chapImages.map((i: any) => ({ id: i.id, name: i.name, mimeType: i.mimeType }))
                  });
                }
             } else {
                console.warn(`Failed to fetch contents for folder ${chap.name}: ${chapFilesRes.status}`);
             }
          } catch (err) {
             console.error(`Exception while fetching contents for folder ${chap.name}`, err);
          }
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
