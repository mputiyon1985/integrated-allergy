import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    stats: {
      totalPatients: 0,
      activeTreatments: 0,
      vialsExpiringSoon: 0,
      dosesThisWeek: 0,
    },
    activity: [],
  });
}
