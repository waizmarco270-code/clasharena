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

    const { codeId, action, newLimit } = await request.json();
    if (!codeId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const codeRef = adminDb.collection('gift-codes').doc(codeId);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (action === 'close') {
      await codeRef.update({ status: 'closed' });
      return NextResponse.json({ success: true, message: `Code ${codeId} has been closed and is now unusable.` });
    } 
    
    if (action === 'reset_limit') {
      // resets currentUses to 0 so the limit starts fresh
      await codeRef.update({ currentUses: 0, status: 'active' });
      return NextResponse.json({ success: true, message: `Code ${codeId} uses have been reset to 0.` });
    }

    if (action === 'delete') {
      await codeRef.delete();
      return NextResponse.json({ success: true, message: `Code ${codeId} has been permanently deleted.` });
    }

    if (action === 'update_limit') {
      if (newLimit === undefined || newLimit < 0) {
        return NextResponse.json({ error: 'Invalid new limit' }, { status: 400 });
      }
      await codeRef.update({ maxUses: Number(newLimit), status: 'active' });
      return NextResponse.json({ success: true, message: `Code ${codeId} limit updated to ${newLimit}.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Manage Code API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
