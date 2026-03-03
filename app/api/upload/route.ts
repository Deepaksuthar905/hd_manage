import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhtrgfrqz',
  api_key: process.env.CLOUDINARY_API_KEY || '471746622146814',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  if (!process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: 'Cloudinary API secret not configured. Set CLOUDINARY_API_SECRET in .env.local' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (!files?.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const urls: string[] = [];
    for (const file of files) {
      if (!(file instanceof File) || !file.type.startsWith('image/')) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUri = `data:${file.type};base64,${base64}`;
      const publicId = `products/${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const result = await new Promise<{ secure_url?: string }>((resolve, reject) => {
        cloudinary.uploader.upload(dataUri, { public_id: publicId }, (err, res) => {
          if (err) reject(err);
          else resolve(res || {});
        });
      });

      if (result?.secure_url) urls.push(result.secure_url);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Cloudinary upload error:', err);
    return NextResponse.json(
      { error: 'Upload failed', details: message },
      { status: 500 }
    );
  }
}
