import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/app/lib/drive';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drive = getDriveClient();

    const res = await drive.files.get({
      fileId: id,
      alt: 'media',
    });

    // Handle different return types from googleapis (stream vs string vs object)
    const data = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
    
    return new NextResponse(data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await req.json();
    const drive = getDriveClient();

    await drive.files.update({
      fileId: id,
      media: {
        mimeType: 'text/plain',
        body: content,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    const drive = getDriveClient();

    await drive.files.update({
      fileId: id,
      requestBody: {
        name: name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drive = getDriveClient();

    await drive.files.delete({
      fileId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
