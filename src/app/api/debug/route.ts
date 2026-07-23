import { NextResponse } from 'next/server';
import { fetchAnalyticsData } from '@/app/actions/admin/analytics';

export async function GET() {
  try {
    const data = await fetchAnalyticsData('7d');
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
