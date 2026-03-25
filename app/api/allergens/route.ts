import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ allergens: [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ id: `ALG-${Date.now()}`, ...body }, { status: 201 });
}
