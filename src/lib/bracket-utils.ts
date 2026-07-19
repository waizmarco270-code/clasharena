export function generateBracketMatches(initialPlayers: any[], maxSlots: number, bracketType: string) {
  const matches: any[] = [];
  const rounds = Math.ceil(Math.log2(maxSlots));
  const totalInitialSlots = Math.pow(2, rounds);

  let players = [...initialPlayers];
  while (players.length < totalInitialSlots) {
    players.push({ id: 'bye', name: 'BYE' });
  }

  // 1. Generate Winners Bracket (or standard Single Elimination bracket)
  for (let r = 1; r <= rounds; r++) {
    const matchesInRound = Math.pow(2, rounds - r);
    for (let m = 0; m < matchesInRound; m++) {
      const matchId = `wb-r${r}-m${m}`;
      
      const matchData: any = {
        id: bracketType === 'double_elimination' ? matchId : `r${r}-m${m}`, // Keep old IDs for single elimination to avoid breaking UI dependencies if any
        round: r,
        matchIndex: m,
        bracketSection: bracketType === 'double_elimination' ? 'winners' : 'single',
        player1Id: r === 1 ? players[m * 2].id : '',
        player1Name: r === 1 ? players[m * 2].name : '',
        player2Id: r === 1 ? players[m * 2 + 1].id : '',
        player2Name: r === 1 ? players[m * 2 + 1].name : '',
        winnerId: '',
        nextMatchId: r < rounds ? (bracketType === 'double_elimination' ? `wb-r${r + 1}-m${Math.floor(m / 2)}` : `r${r + 1}-m${Math.floor(m / 2)}`) : ''
      };

      if (bracketType === 'double_elimination') {
        // Calculate where the loser drops
        let dropRound = 1;
        if (r > 1) {
          dropRound = 2 * r - 2;
        }
        
        // Calculate the LB match index they drop into
        // For r=1, 4 losers drop into 2 matches (m drops into floor(m/2))
        // For r>1, matches drop straight down (m drops into m) because LB round has same number of matches as the WB round that drops into it.
        let dropMatchIndex = r === 1 ? Math.floor(m / 2) : m;
        
        matchData.loserNextMatchId = `lb-r${dropRound}-m${dropMatchIndex}`;

        if (r === rounds) {
          matchData.nextMatchId = 'gf-m0'; // Winners Finals winner goes to Grand Finals
        }
      }

      if (r === 1) {
        if (matchData.player1Id === 'bye' && matchData.player2Id !== 'bye') {
          matchData.winnerId = matchData.player2Id;
          matchData.loserId = 'bye';
        } else if (matchData.player2Id === 'bye' && matchData.player1Id !== 'bye') {
          matchData.winnerId = matchData.player1Id;
          matchData.loserId = 'bye';
        }
      }

      matches.push(matchData);
    }
  }

  // Propagate winners from byes to the next round in memory
  for (const match of matches) {
    if (match.winnerId && match.winnerId !== 'bye' && match.nextMatchId) {
      const nextMatch = matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        const isP1 = match.matchIndex % 2 === 0;
        const winnerName = match.winnerId === match.player1Id ? match.player1Name : match.player2Name;
        if (isP1) {
          nextMatch.player1Id = match.winnerId;
          nextMatch.player1Name = winnerName;
        } else {
          nextMatch.player2Id = match.winnerId;
          nextMatch.player2Name = winnerName;
        }
      }
    }
    
    // Also propagate loser to Losers Bracket if they lost against a bye or auto-forfeited
    if (bracketType === 'double_elimination' && match.loserId && match.loserId !== 'bye' && match.loserNextMatchId) {
      const lbMatch = matches.find(m => m.id === match.loserNextMatchId);
      if (lbMatch) {
        const isP1LB = match.round === 1 ? (match.matchIndex % 2 === 0) : true; // In later rounds, WB loser is always P1 or P2 depending on rules, let's say P1 for empty slot
        const loserName = match.loserId === match.player1Id ? match.player1Name : match.player2Name;
        if (!lbMatch.player1Id) {
           lbMatch.player1Id = match.loserId;
           lbMatch.player1Name = loserName;
        } else {
           lbMatch.player2Id = match.loserId;
           lbMatch.player2Name = loserName;
        }
      }
    }
  }

  // 2. Generate Losers Bracket and Grand Finals
  if (bracketType === 'double_elimination') {
    const lbRounds = 2 * rounds - 2;
    
    // LB match counts pattern: e.g. for N=8 -> 2, 2, 1, 1
    // Matches per round = Math.pow(2, rounds - 1 - Math.ceil(r / 2))
    for (let r = 1; r <= lbRounds; r++) {
      const matchesInRound = Math.pow(2, rounds - 1 - Math.ceil(r / 2));
      for (let m = 0; m < matchesInRound; m++) {
        const matchData: any = {
          id: `lb-r${r}-m${m}`,
          round: r,
          matchIndex: m,
          bracketSection: 'losers',
          player1Id: '',
          player1Name: '',
          player2Id: '',
          player2Name: '',
          winnerId: '',
          nextMatchId: r < lbRounds ? `lb-r${r + 1}-m${Math.floor(m / (r % 2 === 0 ? 2 : 1))}` : 'gf-m0' // Winner of last LB round goes to Grand Finals
        };
        matches.push(matchData);
      }
    }

    // Grand Finals (Match 1)
    matches.push({
      id: 'gf-m0',
      round: 1,
      matchIndex: 0,
      bracketSection: 'grand_finals',
      player1Id: '',
      player1Name: '',
      player2Id: '',
      player2Name: '',
      winnerId: '',
      nextMatchId: 'gf-m1', // If LB winner wins, this triggers gf-m1 (Bracket Reset)
      loserNextMatchId: 'gf-m1' // The loser of gf-m0 goes to gf-m1 if a reset happens
    });

    // Grand Finals Reset (Match 2)
    matches.push({
      id: 'gf-m1',
      round: 2,
      matchIndex: 0,
      bracketSection: 'grand_finals',
      player1Id: '',
      player1Name: '',
      player2Id: '',
      player2Name: '',
      winnerId: '',
      nextMatchId: ''
    });
  }

  return matches;
}
