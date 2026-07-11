import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId, text } = await req.json();

    if (!userId || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (text.length < 20) {
      return NextResponse.json({ error: 'Appeal text too short' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    if (!userData.banned) {
      return NextResponse.json({ error: 'User is not banned' }, { status: 400 });
    }

    if (userData.appealStatus === 'pending') {
      return NextResponse.json({ error: 'Appeal already pending' }, { status: 400 });
    }

    await userRef.update({
      appealText: text,
      appealStatus: 'pending',
      appealedAt: Date.now()
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Appeal API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
