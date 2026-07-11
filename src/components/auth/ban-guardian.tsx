'use client';

import { useProfile } from '@/firebase';
import { BanScreen } from '@/components/ui/ban-screen';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function BanGuardian({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const [deviceBanned, setDeviceBanned] = useState<{ isBanned: boolean; type?: string; expiresAt?: number }>({ isBanned: false });

  // SHADOW LOCKING: Check if the device is tainted in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const blackmark = localStorage.getItem('CA_BLACKMARK_EXPIRY');
      if (blackmark) {
        if (blackmark === 'PERMANENT') {
          setDeviceBanned({ isBanned: true, type: 'permanent' });
        } else {
          const exp = parseInt(blackmark);
          if (Date.now() < exp) {
            setDeviceBanned({ isBanned: true, type: 'temporary', expiresAt: exp });
          } else {
            // Ban expired natively
            localStorage.removeItem('CA_BLACKMARK_EXPIRY');
          }
        }
      }
    }
  }, []);

  // Also verify against the actual profile
  useEffect(() => {
    if (!loading && profile) {
      const owner = typeof window !== 'undefined' ? localStorage.getItem('CA_BLACKMARK_OWNER') : null;

      if (profile.banned) {
        if (profile.banType === 'temporary' && profile.banExpiresAt && Date.now() > profile.banExpiresAt) {
          // Temporary ban expired. If this is the original owner, clear the lock.
          if (owner === profile.id) {
            localStorage.removeItem('CA_BLACKMARK_EXPIRY');
            localStorage.removeItem('CA_BLACKMARK_OWNER');
            setDeviceBanned({ isBanned: false });
          }
        } else {
           setDeviceBanned({ 
             isBanned: true, 
             type: profile.banType, 
             expiresAt: profile.banExpiresAt 
           });
        }
      } else if (deviceBanned.isBanned) {
        // If profile is NOT banned, but device IS banned (Shadow Lock)
        // Check if this unbanned profile is the original OWNER of the blackmark.
        if (owner === profile.id) {
           // Admin has explicitly UNBANNED the original account! Remove the shadow lock.
           localStorage.removeItem('CA_BLACKMARK_EXPIRY');
           localStorage.removeItem('CA_BLACKMARK_OWNER');
           setDeviceBanned({ isBanned: false });
        }
      }
    }
  }, [profile, loading, deviceBanned.isBanned]);

  if (loading) {
    return null; 
  }

  // 1. Direct profile ban check
  if (profile?.banned) {
    if (profile.banType === 'temporary' && profile.banExpiresAt && Date.now() > profile.banExpiresAt) {
       // Expired
    } else {
       return <BanScreen profile={profile} />;
    }
  }

  // 2. Shadow lock check (Alt Account Detection)
  if (deviceBanned.isBanned) {
    // If they are on a new account, they won't have `profile.banType` set, so we use the shadow lock state
    const shadowProfile = profile ? { ...profile } : {};
    shadowProfile.banned = true;
    shadowProfile.banType = deviceBanned.type || 'permanent';
    shadowProfile.banExpiresAt = deviceBanned.expiresAt;
    shadowProfile.banReason = 'ALT ACCOUNT RESTRICTION: Device associated with a banned user.';
    
    return <BanScreen profile={shadowProfile} />;
  }

  return <>{children}</>;
}
