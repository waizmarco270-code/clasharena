'use client';

/**
 * OPTIMIZATION: Global Data Provider
 * 
 * Centralizes all frequently-accessed Firestore listeners into a single
 * context provider mounted at the app root. This eliminates 15-20x
 * duplicated onSnapshot subscriptions that were previously created
 * independently by every component (header, sidebar, page-wrapper,
 * maintenance-guard, dashboard, arena, wallet, profile, etc.).
 * 
 * Static/rarely-changing data (backgrounds, app-settings) is cached in
 * sessionStorage so returning navigation doesn't trigger fresh reads.
 * Dynamic data (user profile, balance) uses live realtime listeners.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useFirestore } from './provider';
import { useUser } from '@clerk/nextjs';

// ── Types ──────────────────────────────────────────────────────────────

interface GlobalData {
  // Static / rarely changing (cached in sessionStorage)
  backgrounds: DocumentData | null;
  backgroundsLoading: boolean;
  maintenance: DocumentData | null;
  maintenanceLoading: boolean;

  // Dynamic (always live)
  profile: DocumentData | null;
  profileLoading: boolean;
  profileError: Error | null;

  // Semi-static (cached with live refresh)
  announcements: DocumentData[];
  announcementsLoading: boolean;
  releases: DocumentData[];
  releasesLoading: boolean;

  // Derived
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

const GlobalDataContext = createContext<GlobalData | null>(null);

// ── SessionStorage Cache Helpers ───────────────────────────────────────
// Only for static/rarely-changing data (backgrounds, app-settings)
// NEVER cache dynamic data like coins, wallet, rewards, live status

const CACHE_PREFIX = 'ca_cache_';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for static data

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCache(key: string, data: any) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

// ── Provider ───────────────────────────────────────────────────────────

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const { user, isLoaded: authLoaded } = useUser();

  // ── Backgrounds (static, cached) ──
  const [backgrounds, setBackgrounds] = useState<DocumentData | null>(() => getCached('backgrounds'));
  const [backgroundsLoading, setBackgroundsLoading] = useState(!getCached('backgrounds'));

  // ── Maintenance (static-ish, cached) ──
  const [maintenance, setMaintenance] = useState<DocumentData | null>(() => getCached('maintenance'));
  const [maintenanceLoading, setMaintenanceLoading] = useState(!getCached('maintenance'));

  // ── User Profile (dynamic, never cached) ──
  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<Error | null>(null);

  // ── Announcements (semi-static, short cache) ──
  const [announcements, setAnnouncements] = useState<DocumentData[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // ── Releases (semi-static, short cache) ──
  const [releases, setReleases] = useState<DocumentData[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(true);

  // ── Subscribe: app-settings/backgrounds (cached in sessionStorage) ──
  useEffect(() => {
    const ref = doc(db, 'app-settings', 'backgrounds');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBackgrounds(data);
        setCache('backgrounds', data); // Cache static data
      }
      setBackgroundsLoading(false);
    }, (err) => {
      console.warn('GlobalData: backgrounds error', err);
      setBackgroundsLoading(false);
    });
    return unsub;
  }, [db]);

  // ── Subscribe: app-settings/maintenance (cached in sessionStorage) ──
  useEffect(() => {
    const ref = doc(db, 'app-settings', 'maintenance');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenance(data);
        setCache('maintenance', data); // Cache static-ish data
      }
      setMaintenanceLoading(false);
    }, (err) => {
      console.warn('GlobalData: maintenance error', err);
      setMaintenanceLoading(false);
    });
    return unsub;
  }, [db]);

  // ── Subscribe: users/{userId} (DYNAMIC — never cached) ──
  useEffect(() => {
    if (!authLoaded) return;
    if (!user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const ref = doc(db, 'users', user.id);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? { ...snap.data(), id: snap.id } : null);
      setProfileLoading(false);
      setProfileError(null);
    }, (err) => {
      console.warn('GlobalData: profile error', err);
      setProfileError(err);
      setProfileLoading(false);
    });
    return unsub;
  }, [db, user?.id, authLoaded]);

  // ── Subscribe: announcements (latest 10) ──
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setAnnouncementsLoading(false);
    }, (err) => {
      console.warn('GlobalData: announcements error', err);
      setAnnouncementsLoading(false);
    });
    return unsub;
  }, [db]);

  // ── Subscribe: releases (latest 5, limited) ──
  useEffect(() => {
    const q = query(collection(db, 'releases'), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      setReleases(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setReleasesLoading(false);
    }, (err) => {
      console.warn('GlobalData: releases error', err);
      setReleasesLoading(false);
    });
    return unsub;
  }, [db]);

  // ── Derived admin flags ──
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || !!profile?.isSuperAdmin;
  const isAdmin = !!profile?.isAdmin || isSuperAdmin;

  const value = useMemo<GlobalData>(() => ({
    backgrounds,
    backgroundsLoading,
    maintenance,
    maintenanceLoading,
    profile,
    profileLoading,
    profileError,
    announcements,
    announcementsLoading,
    releases,
    releasesLoading,
    isAdmin,
    isSuperAdmin,
  }), [
    backgrounds, backgroundsLoading,
    maintenance, maintenanceLoading,
    profile, profileLoading, profileError,
    announcements, announcementsLoading,
    releases, releasesLoading,
    isAdmin, isSuperAdmin,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

// ── Consumer Hooks ─────────────────────────────────────────────────────

function useGlobalData(): GlobalData {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) {
    throw new Error('useGlobalData must be used within GlobalDataProvider');
  }
  return ctx;
}

/** User profile (live realtime, never cached) */
export function useProfile() {
  const { profile, profileLoading, profileError } = useGlobalData();
  return { profile, profileLoading, profileError };
}

/** App backgrounds settings (cached in sessionStorage) */
export function useBackgrounds() {
  const { backgrounds, backgroundsLoading } = useGlobalData();
  return { backgrounds, backgroundsLoading };
}

/** Maintenance config (cached in sessionStorage) */
export function useMaintenance() {
  const { maintenance, maintenanceLoading } = useGlobalData();
  return { maintenance, maintenanceLoading };
}

/** Announcements (latest 10, live) */
export function useAnnouncements() {
  const { announcements, announcementsLoading } = useGlobalData();
  return { announcements, announcementsLoading };
}

/** Release notes (latest 5, live) */
export function useReleases() {
  const { releases, releasesLoading } = useGlobalData();
  return { releases, releasesLoading };
}

/** Admin status flags (derived from profile) */
export function useAdminStatus() {
  const { isAdmin, isSuperAdmin } = useGlobalData();
  return { isAdmin, isSuperAdmin };
}
