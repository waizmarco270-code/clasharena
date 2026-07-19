import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export async function processReferralReward(
  userId: string,
  rechargeAmount: number,
  transaction: FirebaseFirestore.Transaction
) {
  if (rechargeAmount < 30) return false;

  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await transaction.get(userRef);

  if (!userSnap.exists) return false;

  const userData = userSnap.data();
  if (userData?.referredBy && userData?.hasClaimedReferral === false) {
    const referrerId = userData.referredBy;
    const referrerRef = adminDb.collection('users').doc(referrerId);
    
    // Reward 10 coins to referrer
    transaction.update(referrerRef, {
      balance: FieldValue.increment(10),
      totalCoinsEarned: FieldValue.increment(10)
    });

    // Mark referral as claimed for this user
    transaction.update(userRef, {
      hasClaimedReferral: true
    });

    // Update status in referrer's subcollection
    const referralDocRef = referrerRef.collection('referrals').doc(userId);
    transaction.update(referralDocRef, {
      status: 'Completed',
      reward: 10,
      completedAt: FieldValue.serverTimestamp()
    });

    // Add a transaction log for the referrer
    const logRef = adminDb.collection('recharge-requests').doc();
    transaction.set(logRef, {
      userId: referrerId,
      username: 'SYSTEM',
      amount: 0,
      coins: 10,
      status: 'approved',
      method: 'Referral Bonus',
      type: 'REFERRAL_BONUS',
      referredUser: userId,
      createdAt: FieldValue.serverTimestamp()
    });

    return true;
  }

  return false;
}
