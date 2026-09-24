import { doc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function generateThcBracket(tournamentId: string, teams: any[], format: 'single_elimination' | 'double_elimination') {
  if (teams.length < 2) throw new Error("Not enough teams to generate a bracket");

  // Determine next power of 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)));
  const byes = nextPowerOf2 - teams.length;
  
  // Shuffle teams for randomness
  const shuffledTeams = [...teams].sort(() => 0.5 - Math.random());
  
  // Pad with byes
  const paddedTeams: any[] = [...shuffledTeams];
  for (let i = 0; i < byes; i++) {
    paddedTeams.push({ id: 'BYE', name: 'BYE' });
  }

  const { firestore: db } = initializeFirebase();
  const batch = writeBatch(db);
  const matchesCollection = collection(db, 'thc_matches');
  
  // Clear existing matches for this tournament
  const existingMatchesQuery = query(matchesCollection, where('tournamentId', '==', tournamentId));
  const existingMatchesSnap = await getDocs(existingMatchesQuery);
  existingMatchesSnap.forEach(doc => {
     batch.delete(doc.ref);
  });
  
  let matchCounter = 1;
  const totalRounds = Math.log2(nextPowerOf2);

  const roundsData: any = {}; // Store match ids to link them later if needed

  // Generate Upper Bracket (UB)
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = nextPowerOf2 / Math.pow(2, round);
    roundsData[`UB_R${round}`] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const matchRef = doc(matchesCollection);
      
      let team1Id = null;
      let team2Id = null;
      let status = 'pending';
      let winnerId = null;

      if (round === 1) {
        const t1 = paddedTeams[i * 2];
        const t2 = paddedTeams[i * 2 + 1];
        team1Id = t1.id;
        team2Id = t2.id;
        
        // Auto-win if against a BYE
        if (t1.id === 'BYE') { winnerId = t2.id; status = 'completed'; }
        else if (t2.id === 'BYE') { winnerId = t1.id; status = 'completed'; }
      }

      const matchData = {
        id: matchRef.id,
        tournamentId,
        matchNumber: matchCounter++,
        bracket: 'upper',
        round: round,
        roundLabel: round === totalRounds ? 'UB Final' : `UB R${round}`,
        team1Id,
        team2Id,
        winnerId,
        status,
        team1CheckIn: false,
        team2CheckIn: false,
        team1FcSent: false,
        team2FcSent: false,
        team1Stars: 0,
        team2Stars: 0,
        team1AvgTime: 0,
        team2AvgTime: 0,
        team1Screenshot: '',
        team2Screenshot: '',
        nextMatchId: null // We could calculate the tree logic here, but for simplicity we rely on Admin advancing for now
      };

      batch.set(matchRef, matchData);
      roundsData[`UB_R${round}`].push(matchRef.id);
    }
  }

  // If Double Elimination, generate Lower Bracket (LB)
  if (format === 'double_elimination') {
    // Basic structure for LB - exact generation algorithm can get very complex.
    // For V1, we will generate placeholder LB matches. Admin will manually drop teams into them, 
    // or we establish a set number of LB rounds based on totalRounds.
    const lbRounds = (totalRounds - 1) * 2;
    for (let round = 1; round <= lbRounds; round++) {
       // A simplified approach: we just create a pool of LB matches and Grand Finals
       const matchesInRound = Math.pow(2, Math.floor((lbRounds - round) / 2));
       for (let i = 0; i < matchesInRound; i++) {
          const matchRef = doc(matchesCollection);
          batch.set(matchRef, {
             id: matchRef.id,
             tournamentId,
             matchNumber: matchCounter++,
             bracket: 'lower',
             round: round,
             roundLabel: round === lbRounds ? 'LB Final' : `LB R${round}`,
             team1Id: null,
             team2Id: null,
             winnerId: null,
             status: 'pending',
             team1Stars: 0, team2Stars: 0
          });
       }
    }
    
    // Grand Final
    const gfRef = doc(matchesCollection);
    batch.set(gfRef, {
       id: gfRef.id,
       tournamentId,
       matchNumber: matchCounter++,
       bracket: 'final',
       round: 1,
       roundLabel: 'Grand Final',
       team1Id: null,
       team2Id: null,
       winnerId: null,
       status: 'pending',
       team1Stars: 0, team2Stars: 0
    });
    
    // Grand Final Reset
    const gfrRef = doc(matchesCollection);
    batch.set(gfrRef, {
       id: gfrRef.id,
       tournamentId,
       matchNumber: matchCounter++,
       bracket: 'final',
       round: 2,
       roundLabel: 'Grand Final Reset',
       team1Id: null,
       team2Id: null,
       winnerId: null,
       status: 'pending',
       team1Stars: 0, team2Stars: 0
    });
  }

  // Update Tournament Status
  const tRef = doc(db, 'thc_tournaments', tournamentId);
  batch.update(tRef, { status: 'ongoing' });

  await batch.commit();
}
