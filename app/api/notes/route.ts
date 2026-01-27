import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/app/lib/drive';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function GET() {
  try {
    const drive = getDriveClient();
    // Query for text files, not trashed.
    let q = "mimeType = 'text/plain' and trashed = false";
    if (FOLDER_ID) {
      q += ` and '${FOLDER_ID}' in parents`;
    }

    const res = await drive.files.list({
      q,
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });

    return NextResponse.json(res.data.files || []);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, content } = await req.json();
    const drive = getDriveClient();

    const fileMetadata: any = {
      name: name || 'Untitled.txt',
      mimeType: 'text/plain',
    };

    if (FOLDER_ID) {
      fileMetadata.parents = [FOLDER_ID];
    }

    const media = {
      mimeType: 'text/plain',
      body: content || '',
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    return NextResponse.json(file.data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
