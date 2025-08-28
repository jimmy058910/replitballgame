/**
 * @file newCommentaryService.ts
 * @description Generates dynamic, context-aware commentary for match events.
 */

import { MatchEvent } from '../../shared/types/LiveMatchState';
import { InternalMatchState, InternalPlayerState } from './matchEngineTypes';

class NewCommentaryService {

  public generateCommentary(event: MatchEvent, state: InternalMatchState): string {
    switch (event.type) {
        // For now, we only have run plays from the engine
        case 'ROUTINE_PLAY': // This will be replaced by more specific event types
            if (event.stats && (event.stats as any).runnerId) {
                return this.generateRunCommentary(event, state);
            }
            return event.description; // Fallback

        default:
            return event.description; // Return the placeholder for now
    }
  }

  private generateRunCommentary(event: MatchEvent, state: InternalMatchState): string {
    const stats = event.stats as any;
    const team = state.possession === 'home' ? state.homeTeam : state.awayTeam;
    const runner = team.players.get(stats.playerStats[0].id);
    const yards = stats.playerStats[0].rushingYards;

    if (!runner) return "A player rushes forward.";

    const runnerName = runner.name;

    // Race-Based Runs from user spec
    if (runner.race === "umbra" && yards > 8) {
      return `Where did he go?! ${runnerName} seems to vanish for a moment with his Shadow Step, and the defender is left tackling empty space for ${yards} yards!`;
    }
    if (runner.race === "sylvan" && yards > 6) {
      return `The Sylvan runner shows off that natural agility, weaving through defenders with ease for ${yards} yards.`;
    }
    if (runner.race === "gryll" && yards <= 4) {
      return `It's like trying to tackle a boulder! The Gryll runner ${runnerName} simply shrugs off the hit and keeps moving for ${yards} tough yards.`;
    }

    // Breakaway Runs
    if (stats.playerStats[0].breakawayRuns > 0) {
        const commentary = [
            `He finds a seam! ${runnerName} turns on the jets and is in open space for a massive ${yards}-yard gain!`,
            `Explosive speed! ${runnerName} leaves the defense in the dust with a ${yards}-yard burst!`,
            `There's no catching him! ${runnerName} shows off that world-class speed for ${yards} yards!`,
        ];
        return state.rng.choice(commentary);
    }

    // Standard Runs
    if (yards > 0) {
        const commentary = [
            `${runnerName} grinds it out for ${yards} tough yards up the middle.`,
            `${runnerName} finds a small crease and picks up a solid ${yards} yards.`,
            `A quick dash by ${runnerName} for a ${yards}-yard gain.`,
        ];
        return state.rng.choice(commentary);
    }

    // Stuffed at the line
    return `${runnerName} is stopped at the line of scrimmage for no gain.`;
  }

  // TODO: Add methods for other commentary categories (pass, defense, score, atmosphere, etc.)
}

export const newCommentaryService = new NewCommentaryService();
