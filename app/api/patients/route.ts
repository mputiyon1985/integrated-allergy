import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ patients: [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ id: `PA-${Date.now()}`, ...body }, { status: 201 });
}
