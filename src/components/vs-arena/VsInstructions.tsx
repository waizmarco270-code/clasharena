'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, Swords, UploadCloud, CheckCircle2 } from 'lucide-react';
import { VsRules } from './VsRules';

export function VsInstructions({ reqTh }: { reqTh?: string }) {
  return (
    <div className="space-y-6">
      <Card className="glass border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> General Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">1</div>
            <div>
              <h4 className="font-black text-white uppercase text-sm mb-1">Create or Join the Clan</h4>
              <p className="text-xs text-muted-foreground">The challenge creator must create a brand new level 1 clan in Clash of Clans named exactly <strong className="text-white">CA - 1vs1</strong> and input the Clan Link at the top of this Battle Room. Both players must join this clan to battle.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-black">2</div>
            <div>
              <h4 className="font-black text-white uppercase text-sm mb-1">Play Best of 3</h4>
              <p className="text-xs text-muted-foreground">Issue Friendly Challenges in the clan using eSports difficulty. You will play a maximum of 3 rounds. The first player to win 2 rounds claims the entire escrow pool!</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-black">3</div>
            <div>
              <h4 className="font-black text-white uppercase text-sm mb-1">Submit Round Results</h4>
              <p className="text-xs text-muted-foreground">After each round, go to the <strong>BATTLE LOGS (ROUNDS)</strong> tab. Enter your Stars, Total Destruction %, Time Taken, and upload the screenshot proof. Our system will automatically determine the winner of that round based on the rules.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {reqTh && <VsRules reqTh={reqTh} />}

      <Card className="glass border-red-500/30 bg-red-950/10">
         <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-red-500 flex items-center gap-2">
               <AlertCircle className="w-5 h-5" /> Fair Play Warning
            </CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-sm text-red-200/80 leading-relaxed">
               Lying about your stars, destruction percentage, or time is strictly prohibited. If you upload fake screenshots or submit incorrect data to steal a win, you will be <strong className="text-red-500 font-bold uppercase">permanently banned</strong> and your V-Cash will be seized. Play fair and respect your opponents!
            </p>
         </CardContent>
      </Card>
    </div>
  );
}
