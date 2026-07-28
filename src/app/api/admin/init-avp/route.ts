import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  if (!adminDb) return NextResponse.json({ error: 'No db' });
  await adminDb.collection('app-settings').doc('avp-stock').set({
    monthlyOfferStock: 10,
    permanentStock: 5,
    weeklyStock: 99999 // Unlimited technically, but good to have
  });
  return NextResponse.json({ success: true });
}
