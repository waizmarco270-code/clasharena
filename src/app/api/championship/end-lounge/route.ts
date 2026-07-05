import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const isSuperAdmin = userDoc.exists && userDoc.data()?.isSuperAdmin === true;
    const isStandardAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;
    const isAdmin = isSuperAdmin || isStandardAdmin;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    const { championshipId } = body;

    if (!championshipId) {
      return NextResponse.json({ error: 'Missing championshipId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    await tRef.update({
      loungeClosed: true
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error ending lounge session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
