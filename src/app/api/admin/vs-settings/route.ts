import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.isAdmin && !userData?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const docRef = adminDb.collection('app-settings').doc('vs-arena');
    const snap = await docRef.get();
    
    if (!snap.exists) {
      return NextResponse.json({ settlementMode: 'auto' });
    }

    return NextResponse.json(snap.data());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.isAdmin && !userData?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { settlementMode } = await request.json();
    if (settlementMode !== 'auto' && settlementMode !== 'manual') {
       return NextResponse.json({ error: 'Invalid settlement mode' }, { status: 400 });
    }

    const docRef = adminDb.collection('app-settings').doc('vs-arena');
    await docRef.set({ settlementMode }, { merge: true });

    return NextResponse.json({ success: true, settlementMode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
