export interface CbzPageInfo {
  index: number;
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number; // 0 = STORE, 8 = DEFLATE
  localHeaderOffset: number;
}

export interface CbzMetadata {
  fileType: 'CBZ';
  pageCount: number;
  pages: CbzPageInfo[];
}

export function readUInt32LE(buf: Uint8Array, offset: number): number {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}

export function readUInt16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

export async function getRemoteFileSize(url: string, headers: Record<string, string>): Promise<number> {
  const fetchHeaders = { ...headers, Range: 'bytes=0-0' };
  const res = await fetch(url, { method: 'GET', headers: fetchHeaders, redirect: 'follow' });
  
  if (!res.ok && res.status !== 206) {
    throw new Error(`Failed to fetch file size. Status: ${res.status}`);
  }

  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && res.status === 200) {
    return parseInt(contentLength, 10);
  }

  throw new Error('Could not determine remote file size');
}

export async function getRemoteCbzMetadata(url: string, headers: Record<string, string>, fileSize: number): Promise<CbzMetadata> {
  const eocdFetchSize = Math.min(fileSize, 65557);
  const eocdStart = fileSize - eocdFetchSize;
  const eocdRes = await fetch(url, {
    method: 'GET',
    headers: { ...headers, Range: `bytes=${eocdStart}-${fileSize - 1}` },
    redirect: 'follow'
  });
  if (!eocdRes.ok && eocdRes.status !== 206) throw new Error(`Failed to fetch EOCD: ${eocdRes.status}`);
  
  const eocdBuffer = new Uint8Array(await eocdRes.arrayBuffer());
  
  let eocdOffset = -1;
  for (let i = eocdBuffer.length - 22; i >= 0; i--) {
    if (eocdBuffer[i] === 0x50 && eocdBuffer[i+1] === 0x4b && eocdBuffer[i+2] === 0x05 && eocdBuffer[i+3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Could not find ZIP End of Central Directory');
  }

  const cdSize = readUInt32LE(eocdBuffer, eocdOffset + 12);
  const cdOffset = readUInt32LE(eocdBuffer, eocdOffset + 16);
  const recordCount = readUInt16LE(eocdBuffer, eocdOffset + 10);

  if (cdOffset + cdSize > fileSize) {
    throw new Error('Invalid Central Directory offset or size');
  }

  const cdRes = await fetch(url, {
    method: 'GET',
    headers: { ...headers, Range: `bytes=${cdOffset}-${cdOffset + cdSize - 1}` },
    redirect: 'follow'
  });
  if (!cdRes.ok && cdRes.status !== 206) throw new Error(`Failed to fetch Central Directory: ${cdRes.status}`);
  
  const cdBuffer = new Uint8Array(await cdRes.arrayBuffer());
  const pages: CbzPageInfo[] = [];
  const textDecoder = new TextDecoder('utf-8');

  let pos = 0;
  for (let i = 0; i < recordCount; i++) {
    if (pos + 46 > cdBuffer.length) break;
    
    if (cdBuffer[pos] !== 0x50 || cdBuffer[pos+1] !== 0x4b || cdBuffer[pos+2] !== 0x01 || cdBuffer[pos+3] !== 0x02) {
      break;
    }

    const compressionMethod = readUInt16LE(cdBuffer, pos + 10);
    const compressedSize = readUInt32LE(cdBuffer, pos + 20);
    const uncompressedSize = readUInt32LE(cdBuffer, pos + 24);
    const fileNameLength = readUInt16LE(cdBuffer, pos + 28);
    const extraFieldLength = readUInt16LE(cdBuffer, pos + 30);
    const fileCommentLength = readUInt16LE(cdBuffer, pos + 32);
    const localHeaderOffset = readUInt32LE(cdBuffer, pos + 42);

    const fileNameBuf = cdBuffer.subarray(pos + 46, pos + 46 + fileNameLength);
    const fileName = textDecoder.decode(fileNameBuf);

    if (!fileName.endsWith('/') && fileName.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i) && !fileName.includes('__MACOSX') && !fileName.split('/').pop()?.startsWith('._')) {
      pages.push({
        index: 0,
        name: fileName,
        compressedSize,
        uncompressedSize,
        compressionMethod,
        localHeaderOffset,
      });
    }

    pos += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  pages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  pages.forEach((p, i) => p.index = i);

  return {
    fileType: 'CBZ',
    pageCount: pages.length,
    pages,
  };
}
