import { describe, it, expect } from "vitest";

// Example utility function tests
describe("Utility Function Tests", () => {
  // Example utility functions to test
  const calculatePowerRating = (stats: { speed: number; power: number; throwing: number; catching: number; kicking: number }) => {
    return stats.speed + stats.power + stats.throwing + stats.catching + stats.kicking;
  };

  const generatePlayerName = (race: string) => {
    const namesByRace = {
      human: ["John", "Sarah", "Mike", "Emma"],
      sylvan: ["Elrond", "Galadriel", "Legolas", "Arwen"],
      gryll: ["Thorin", "Gimli", "Dain", "Balin"],
      lumina: ["Aurora", "Stella", "Nova", "Luna"],
      umbra: ["Shadow", "Raven", "Void", "Eclipse"]
    };
    
    const names = namesByRace[race as keyof typeof namesByRace] || namesByRace.human;
    return names[Math.floor(Math.random() * names.length)];
  };

  it("should calculate power rating correctly", () => {
    const playerStats = {
      speed: 20,
      power: 25,
      throwing: 30,
      catching: 15,
      kicking: 10
    };
    
    const powerRating = calculatePowerRating(playerStats);
    expect(powerRating).toBe(100);
  });

  it("should generate valid names for different races", () => {
    const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
    
    races.forEach(race => {
      const name = generatePlayerName(race);
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it("should handle invalid race gracefully", () => {
    const name = generatePlayerName("invalid_race");
    expect(name).toBeTruthy();
    expect(typeof name).toBe("string");
  });
});