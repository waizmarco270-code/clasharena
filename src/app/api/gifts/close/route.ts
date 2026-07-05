import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export async function POST(request: Request) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const callerDoc = await adminDb.collection('users').doc(callerId).get();
    const callerData = callerDoc.data();
    const isSuperAdmin = callerId === MASTER_SUPER_ADMIN_ID || callerData?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 });
    }

    const { giftId, action } = await request.json();
    if (!giftId) return NextResponse.json({ error: 'Missing giftId' }, { status: 400 });

    const giftRef = adminDb.collection('global-gifts').doc(giftId);
    const giftSnap = await giftRef.get();

    if (!giftSnap.exists) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    if (action === 'delete') {
      await giftRef.delete();
      return NextResponse.json({ success: true, message: 'Gift successfully deleted' });
    }

    await giftRef.update({
      status: 'closed'
    });

    return NextResponse.json({ success: true, message: 'Gift successfully closed' });

  } catch (error: any) {
    console.error("Close Gift API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
