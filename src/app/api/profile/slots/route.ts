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

    const body = await req.json();
    const { action, slotId, tag: rawTag, username, townHall } = body;

    if (!action || !slotId || slotId < 1 || slotId > 5) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("User not found");
      }

      const userData = userDoc.data() || {};
      const balance = userData.balance || 0;
      const accountSlots = userData.accountSlots || {};
      
      let slot1Migrated = false;
      // Initialize Slot 1 if it doesn't exist but root data does
      if (!accountSlots['1'] && userData.tag && userData.username && userData.townHall) {
        accountSlots['1'] = {
          tag: userData.tag,
          username: userData.username,
          townHall: userData.townHall,
          isFilled: true
        };
        slot1Migrated = true;
      }

      const currentSlot = accountSlots[slotId] || {};
      const updates: any = {};
      
      if (slot1Migrated) {
        updates['accountSlots.1'] = accountSlots['1'];
      }
      const batchLogs: any[] = [];

      if (action === 'unlock_edit') {
        if (slotId > 3) throw new Error("This action is only for free slots.");
        if (balance < 5) throw new Error("Insufficient Arena Coins (5 required).");

        updates[`accountSlots.${slotId}.unlockedForEdit`] = true;
        updates.balance = FieldValue.increment(-5);

        batchLogs.push({
          type: 'SLOT_EDIT_UNLOCK',
          amount: -5,
          userId,
          description: `Unlocked Slot ${slotId} for editing`,
          timestamp: FieldValue.serverTimestamp()
        });
      } 
      else if (action === 'buy_slot') {
        if (slotId < 4) throw new Error("This slot is already free.");
        if (currentSlot.isPurchased) throw new Error("Slot already purchased.");
        
        const cost = slotId === 4 ? 50 : 100;
        if (balance < cost) throw new Error(`Insufficient Arena Coins (${cost} required).`);

        updates[`accountSlots.${slotId}.isPurchased`] = true;
        updates.balance = FieldValue.increment(-cost);

        batchLogs.push({
          type: 'SLOT_PURCHASE',
          amount: -cost,
          userId,
          description: `Purchased Premium Slot ${slotId}`,
          timestamp: FieldValue.serverTimestamp()
        });
      }
      else if (action === 'save_slot') {
        if (!username || !rawTag || !townHall) {
          throw new Error("Missing required slot fields.");
        }

        // Validate unique tag
        const tag = rawTag.trim().startsWith('#') ? rawTag.trim().toUpperCase() : `#${rawTag.trim().toUpperCase()}`;
        const usersRef = adminDb.collection('users');
        const existingUsers = await usersRef.where('tag', '==', tag).limit(1).get();
        if (!existingUsers.empty && existingUsers.docs[0].id !== userId) {
          throw new Error(`The Player ID ${tag} is already registered to another Clash Arena account.`);
        }

        // Check if allowed to edit
        if (slotId <= 3) {
          // Free slots
          if (currentSlot.isFilled && !currentSlot.unlockedForEdit && accountSlots['1']) {
            // Wait, if it's slot 1, 2, or 3, and it's filled, it needs to be unlocked.
            throw new Error(`Slot ${slotId} is locked. Pay 5 Arena Coins to unlock it for editing.`);
          }
        } else {
          // Paid slots
          if (!currentSlot.isPurchased) {
            throw new Error(`Slot ${slotId} must be purchased first.`);
          }
        }

        const newSlotData = {
          ...currentSlot,
          tag,
          username,
          townHall: Number(townHall),
          isFilled: true
        };
        
        // Relock free slots automatically
        if (slotId <= 3) {
           newSlotData.unlockedForEdit = false;
        }

        updates[`accountSlots.${slotId}`] = newSlotData;

        // If it's the default slot, or if the default slot is not set and we just filled slot 1
        const defaultSlotId = userData.defaultSlotId || 1;
        if (defaultSlotId === slotId || (!userData.defaultSlotId && slotId === 1)) {
          updates.defaultSlotId = slotId;
          updates.tag = tag;
          updates.username = username;
          updates.townHall = Number(townHall);
          
          if (userData.clashData) {
            updates['clashData.tag'] = tag;
            updates['clashData.name'] = username;
            updates['clashData.townHallLevel'] = Number(townHall);
          }
        }
      }
      else if (action === 'set_default') {
        if (!currentSlot.isFilled) throw new Error("Cannot set an empty slot as default.");

        updates.defaultSlotId = slotId;
        updates.tag = currentSlot.tag;
        updates.username = currentSlot.username;
        updates.townHall = currentSlot.townHall;

        if (userData.clashData) {
          updates['clashData.tag'] = currentSlot.tag;
          updates['clashData.name'] = currentSlot.username;
          updates['clashData.townHallLevel'] = currentSlot.townHall;
        }
      }
      else {
        throw new Error("Unknown action.");
      }

      transaction.update(userRef, updates);
      
      if (batchLogs.length > 0) {
        for (const log of batchLogs) {
          transaction.set(adminDb.collection('logs').doc(), log);
        }
      }

      return { result: { success: true }, userData, updates };
    });

    // FCM Topic Subscription update (outside transaction to avoid slowing it down)
    // We do this if updates.townHall exists and is different from userData.townHall
    // Or if the user hasn't set up a townHall before (userData.townHall is undefined)
    const txData = result as any;
    const newTH = txData?.updates?.townHall;
    const oldTH = txData?.userData?.townHall;
    const fcmTokens = txData?.userData?.fcmTokens;
    
    if (newTH && newTH !== oldTH && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
      try {
        const { adminMessaging } = await import('@/lib/firebase-admin');
        if (adminMessaging) {
          const tokens = fcmTokens;
          // Unsubscribe from old topic if exists
          if (oldTH) {
            await adminMessaging.unsubscribeFromTopic(tokens, `th_${oldTH}_alerts`).catch(() => {});
          }
          // Subscribe to new topic
          await adminMessaging.subscribeToTopic(tokens, `th_${newTH}_alerts`).catch(() => {});
          console.log(`Successfully migrated ${tokens.length} tokens to topic th_${newTH}_alerts for user ${userId}`);
        }
      } catch (err) {
        console.error("FCM Topic Migration Error:", err);
        // Don't fail the slot update just because FCM failed
      }
    }

    return NextResponse.json(txData.result);

  } catch (error: any) {
    console.error("Profile Slot API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
