import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (!files?.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (!(file instanceof File) || !file.type.startsWith('image/')) continue;
      const ext = path.extname(file.name) || '.jpg';
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(uploadDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      urls.push(`/uploads/${safeName}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
