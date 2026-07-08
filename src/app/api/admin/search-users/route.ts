import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const callerDoc = await adminDb.collection('users').doc(userId).get();
    const callerData = callerDoc.data();
    if (!callerData?.isAdmin && !callerData?.isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    let usersRef: FirebaseFirestore.Query = adminDb.collection('users');

    if (q.startsWith('#')) {
      // Search by exact cocTag
      usersRef = usersRef.where('cocTag', '==', q).limit(5);
    } else {
      // Search by username prefix
      usersRef = usersRef
        .where('username', '>=', q)
        .where('username', '<=', q + '\uf8ff')
        .limit(10);
    }

    const snap = await usersRef.get();
    const users = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username || 'Unknown',
        cocTag: data.cocTag || '',
        photoURL: data.photoURL || ''
      };
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("Search users error:", err);
    return new NextResponse(err.message, { status: 500 });
  }
}
