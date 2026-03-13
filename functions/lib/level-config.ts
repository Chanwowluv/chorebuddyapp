export const LEVEL_THRESHOLDS = [
  { level: 1, minPoints: 0, title: "Rookie", icon: "🌱" },
  { level: 2, minPoints: 100, title: "Helper", icon: "🧹" },
  { level: 3, minPoints: 300, title: "Pro", icon: "⭐" },
  { level: 4, minPoints: 600, title: "Star", icon: "🌟" },
  { level: 5, minPoints: 1000, title: "Champion", icon: "🏆" },
  { level: 6, minPoints: 2000, title: "Legend", icon: "👑" },
] as const;

export function getLevelForPoints(totalPoints: number): { level: number; title: string; icon: string } {
  let currentLevel = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalPoints >= threshold.minPoints) {
      currentLevel = threshold;
    } else {
      break;
    }
  }
  return { level: currentLevel.level, title: currentLevel.title, icon: currentLevel.icon };
}

export function getNextLevelInfo(totalPoints: number): { nextLevel: number; pointsNeeded: number; title: string } | null {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalPoints < threshold.minPoints) {
      return {
        nextLevel: threshold.level,
        pointsNeeded: threshold.minPoints - totalPoints,
        title: threshold.title
      };
    }
  }
  return null;
}

// Dummy handler to satisfy deployment requirements
Deno.serve(async () => {
  return new Response("Level Config Library", { status: 200 });
});