import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

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

    const { code, amount, maxUses, expireDays, expireHours, expireMins, rewardType = 'coins' } = await request.json();

    if (!code || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters. Code and positive amount are required.' }, { status: 400 });
    }

    // Normalize code (uppercase, trim spaces, max 20 chars for safety)
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '').substring(0, 20);

    const codeRef = adminDb.collection('gift-codes').doc(normalizedCode);
    const codeSnap = await codeRef.get();

    if (codeSnap.exists) {
      return NextResponse.json({ error: 'This exact code already exists in the database!' }, { status: 409 });
    }

    let expiresAt = null;
    const days = Number(expireDays) || 0;
    const hours = Number(expireHours) || 0;
    const mins = Number(expireMins) || 0;

    if (days > 0 || hours > 0 || mins > 0) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      date.setHours(date.getHours() + hours);
      date.setMinutes(date.getMinutes() + mins);
      expiresAt = date.toISOString();
    }

    await codeRef.set({
      code: normalizedCode,
      amount: Number(amount),
      rewardType,
      maxUses: Number(maxUses) || 0, // 0 = unlimited
      currentUses: 0,
      expiresAt: expiresAt,
      status: 'active',
      createdBy: callerId,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: `Code ${normalizedCode} generated successfully!` });

  } catch (error: any) {
    console.error("Create Code API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
