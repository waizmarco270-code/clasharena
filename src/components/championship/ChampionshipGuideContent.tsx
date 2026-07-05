import { Info, Users, Swords, Crown } from 'lucide-react';

export function ChampionshipGuideContent() {
  return (
    <div className="space-y-6 text-sm text-white/80 leading-relaxed custom-scrollbar p-2">
      <div className="space-y-4">
        <p className="text-base text-white">Welcome to the <b>Championship Arena</b>! This is a highly strategic, phase-based tournament format. Here is everything you need to know to dominate the battlefield.</p>
      </div>

      <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg">
        <h4 className="font-black uppercase text-yellow-500 flex items-center gap-2 text-lg"><Users className="w-5 h-5"/> 1. Party Creation & Registration</h4>
        <ul className="space-y-3 list-none pl-6 relative mt-4">
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">🛡️</span> <b className="text-white">Join or Create:</b> You can register as a Solo player, or create a Party (up to 8 players) with your friends.</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">🤝</span> <b className="text-white">Party Guarantee:</b> Being in a Party guarantees you will be drafted onto the <b>same team</b> as your friends!</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">⚖️</span> <b className="text-white">TH Balancing:</b> Parties cannot exceed 50% of the tournament's quota for any specific Town Hall level. Keep it balanced!</li>
        </ul>
      </div>

      <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg">
        <h4 className="font-black uppercase text-purple-400 flex items-center gap-2 text-lg"><Crown className="w-5 h-5"/> 2. Leader Selection & Live Draft</h4>
        <ul className="space-y-3 list-none pl-6 relative mt-4">
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">👑</span> <b className="text-white">Team Leaders:</b> 2 players will be selected to captain Team A and Team B. You can apply for free, or buy a Leader Pass.</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">🔥</span> <b className="text-white">Live Draft:</b> Leaders take turns picking Parties and Solo players from the available pool in a live draft session.</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">📊</span> <b className="text-white">Strict Quotas:</b> Leaders must draft exactly 50% of each Town Hall level. The UI enforces this automatically.</li>
        </ul>
      </div>

      <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg">
        <h4 className="font-black uppercase text-red-400 flex items-center gap-2 text-lg"><Swords className="w-5 h-5"/> 3. The Battle Phase (Mirror Matches)</h4>
        <ul className="space-y-3 list-none pl-6 relative mt-4">
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">⚔️</span> <b className="text-white">Mirror Matchups:</b> You must only attack your exact mirror on the enemy team! (e.g., if you are TH16 #4, you attack the enemy TH16 #4).</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">⭐</span> <b className="text-white">Scoring:</b> The team with the most total stars wins. Tiebreakers are decided by total destruction percentage.</li>
          <li className="relative"><span className="absolute -left-6 top-0.5 text-lg">📸</span> <b className="text-white">Verification:</b> After attacking, upload a screenshot of your result. The Admins will verify the scores and distribute the prize pool!</li>
        </ul>
      </div>

      <div className="bg-blue-900/20 p-5 rounded-2xl border border-blue-500/30 text-center shadow-[0_0_15px_rgba(37,99,235,0.1)]">
        <p className="font-black uppercase text-blue-400 mb-2 text-lg">Pro Tip 💡</p>
        <p className="text-sm font-medium text-blue-100">Use the Global Chat (💬) in the Lobby to find teams, share invite codes, and strategize before the draft begins!</p>
      </div>
    </div>
  );
}
