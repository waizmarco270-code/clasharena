import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    
    // We use a transaction to ensure atomic balance deduction
    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const data = userDoc.data();
      const currentBalance = data?.balance || 0;

      if (currentBalance < 5) {
        throw new Error('Insufficient Arena Coins. You need 5 coins to buy a Profile Changer Card.');
      }

      // Deduct 5 coins and unlock the profile
      transaction.update(userRef, {
        balance: FieldValue.increment(-5),
        profileLockedUntil: null,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Profile Changer Card API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message?.includes('Insufficient') ? 400 : 500 });
  }
}
