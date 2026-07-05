import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { championshipId } = await req.json();

    if (!championshipId) {
      return NextResponse.json({ error: 'Missing championshipId' }, { status: 400 });
    }

    const tRef = db.collection('tournaments').doc(championshipId);
    const tDoc = await tRef.get();

    if (!tDoc.exists) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tData = tDoc.data();
    if (tData?.status !== 'draft') {
      return NextResponse.json({ error: 'Deadlock break is only available during the draft phase' }, { status: 400 });
    }

    const regsRef = tRef.collection('registrations');
    const allRegs = await regsRef.get();
    
    const batch = db.batch();
    
    allRegs.docs.forEach(doc => {
      batch.update(doc.ref, { partyId: null });
    });

    const partiesRef = tRef.collection('parties');
    const allParties = await partiesRef.get();
    
    allParties.docs.forEach(doc => {
       batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ success: true, message: 'All remaining parties dissolved into solos.' });
  } catch (error: any) {
    console.error('Break Deadlock Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
