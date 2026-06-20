
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Swords, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary rounded-2xl glow-primary rotate-3">
              <Swords className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl font-black italic tracking-tighter">
            ARENA <span className="text-primary">ACCESS</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            The ultimate competitive ecosystem awaits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={handleGoogleLogin}
              className="w-full bg-white text-black hover:bg-gray-100 font-bold h-12 gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              SIGN IN WITH GOOGLE
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center uppercase font-bold tracking-widest">
            <ShieldCheck className="w-3 h-3 text-primary" />
            Fair Play & Anti-Cheat Enabled
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
