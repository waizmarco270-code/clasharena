import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId, weekOrDayId } = await request.json(); // e.g., 'week1', 'week2', 'day1', 'day7'

    if (!userId || !weekOrDayId || !adminDb) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);

    const result = await adminDb.runTransaction(async (transaction: any) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");

      const userData = userSnap.data();
      if (!userData.isVip) throw new Error("Not an active VIP");

      const vipType = userData.vipType || 'weekly';
      const startDate = userData.vipStartDate ? userData.vipStartDate.toDate() : new Date();
      const now = new Date();
      
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentWeek = Math.floor(daysSinceStart / 7) + 1;

      // Validate time constraints
      if (vipType === 'monthly' || vipType === 'permanent') {
        const reqWeek = parseInt(weekOrDayId.replace('week', ''));
        if (currentWeek < reqWeek && vipType !== 'permanent') {
           throw new Error(`Week ${reqWeek} rewards are locked. You are in week ${currentWeek}.`);
        }
      } else if (vipType === 'weekly') {
        if (weekOrDayId === 'day7' && daysSinceStart < 6) { // 0-indexed days
           throw new Error("Day 7 rewards are locked until day 7.");
        }
      }

      const weeklyClaims = userData.weeklyClaims || {};
      if (weeklyClaims[weekOrDayId]) {
        throw new Error("Reward already claimed.");
      }

      // Determine rewards
      const updates: any = {
        [`weeklyClaims.${weekOrDayId}`]: true
      };

      let message = "";

      if (vipType === 'monthly' || vipType === 'permanent') {
        if (weekOrDayId === 'week1') {
          updates['inventory.bronzeTickets'] = FieldValue.increment(2);
          updates['inventory.totalBronzeTicketsEarned'] = FieldValue.increment(2);
          message = "Claimed 2x Bronze Tickets!";
        } else if (weekOrDayId === 'week2') {
          updates['inventory.silverTickets'] = FieldValue.increment(2);
          updates['inventory.totalSilverTicketsEarned'] = FieldValue.increment(2);
          message = "Claimed 2x Silver Tickets!";
        } else if (weekOrDayId === 'week3') {
          updates['inventory.goldenTickets'] = FieldValue.increment(1);
          updates['inventory.totalGoldenTicketsEarned'] = FieldValue.increment(1);
          message = "Claimed 1x Golden Ticket!";
        } else if (weekOrDayId === 'week4') {
          updates['inventory.bronzeTickets'] = FieldValue.increment(1);
          updates['inventory.totalBronzeTicketsEarned'] = FieldValue.increment(1);
          updates['inventory.silverTickets'] = FieldValue.increment(1);
          updates['inventory.totalSilverTicketsEarned'] = FieldValue.increment(1);
          updates['inventory.goldenTickets'] = FieldValue.increment(1);
          updates['inventory.totalGoldenTicketsEarned'] = FieldValue.increment(1);
          updates.balance = FieldValue.increment(100);
          updates.totalCoinsEarned = FieldValue.increment(100);
          message = "Claimed VIP Bundle: Tickets & 100 Coins!";
        } else {
          throw new Error("Invalid claim ID");
        }
      } else if (vipType === 'weekly') {
        if (weekOrDayId === 'day1') {
          updates['inventory.bronzeTickets'] = FieldValue.increment(1);
          updates['inventory.totalBronzeTicketsEarned'] = FieldValue.increment(1);
          message = "Claimed 1x Bronze Ticket!";
        } else if (weekOrDayId === 'day7') {
          updates['inventory.silverTickets'] = FieldValue.increment(1);
          updates['inventory.totalSilverTicketsEarned'] = FieldValue.increment(1);
          updates.balance = FieldValue.increment(30);
          updates.totalCoinsEarned = FieldValue.increment(30);
          message = "Claimed Day 7 Bonus: 1x Silver Ticket & 30 Coins!";
        } else {
          throw new Error("Invalid claim ID");
        }
      }

      transaction.update(userRef, updates);

      return { success: true, message };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
