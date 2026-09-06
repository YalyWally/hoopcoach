// Assessment battery definitions. Each test declares how it is scored and
// which player-development category it feeds into. Benchmarks are tuned to
// an "intermediate high-school" baseline (rating ~70) and shifted slightly
// by age/experience so results stay meaningful and motivating across a wide
// range of players, without pretending to be a scientific norm table.

export const EXPERIENCE_LEVELS = ['beginner', 'junior_high', 'jv', 'varsity', 'college', 'pro_track'];

const EXPERIENCE_FACTOR = {
  beginner: 0.82,
  junior_high: 0.9,
  jv: 0.97,
  varsity: 1.0,
  college: 1.08,
  pro_track: 1.15,
};

function ageFactor(age) {
  if (age == null) return 1.0;
  if (age < 11) return 0.72;
  if (age < 13) return 0.8;
  if (age < 15) return 0.88;
  if (age < 17) return 0.96;
  if (age < 19) return 1.0;
  return 1.03;
}

function zRating(value, mean, sd, direction, factor) {
  const adjMean = direction === 'higher' ? mean * factor : mean / factor;
  const z = direction === 'higher' ? (value - adjMean) / sd : (adjMean - value) / sd;
  const rating = Math.round(50 + z * 15);
  return Math.max(25, Math.min(99, rating));
}

function combinedFactor(player) {
  const exp = EXPERIENCE_FACTOR[player.experience_level] ?? 1.0;
  const age = ageFactor(player.age);
  return Math.sqrt(exp * age);
}

// direction: 'higher' = bigger raw number is better, 'lower' = smaller is better
export const TESTS = [
  // ---- Shooting ----
  { id: 'ft_makes', label: 'Free Throws Made', unit: '/ 20', category: 'shooting', direction: 'higher', mean: 14, sd: 4, instructions: 'Shoot 20 free throws with a consistent pre-shot routine. Record total makes.', max: 20 },
  { id: 'midrange_makes', label: 'Midrange Makes (5 spots)', unit: '/ 20', category: 'shooting', direction: 'higher', mean: 11, sd: 4, instructions: 'Shoot 4 shots from each of 5 midrange spots (both elbows, both wings, top of key). Record total makes.', max: 20 },
  { id: 'three_makes', label: 'Three-Point Makes (5 spots)', unit: '/ 20', category: 'shooting', direction: 'higher', mean: 8, sd: 4, instructions: 'Shoot 4 three-pointers from each of 5 spots around the arc. Record total makes.', max: 20 },
  { id: 'catch_shoot_makes', label: 'Catch-and-Shoot Makes', unit: '/ 15', category: 'shooting', direction: 'higher', mean: 9, sd: 3, instructions: 'Catch and shoot 15 passes from game-realistic spots. Record total makes.', max: 15 },
  // ---- Ball handling ----
  { id: 'cone_dribble_time', label: 'Cone Dribble Course', unit: 'seconds', category: 'ball_handling', direction: 'lower', mean: 22, sd: 4, instructions: 'Dribble full speed through a standard 8-cone weave course (both directions). Record time in seconds.' },
  { id: 'two_ball_drops', label: 'Two-Ball Control Drops', unit: 'drops / 30s', category: 'ball_handling', direction: 'lower', mean: 3, sd: 2, instructions: 'Two-ball simultaneous dribbling for 30 seconds. Count how many times you lose control of a ball.' },
  // ---- Finishing ----
  { id: 'layup_makes_right', label: 'Right-Hand Layups Made', unit: '/ 10', category: 'finishing', direction: 'higher', mean: 8, sd: 2, instructions: 'Live-speed right-hand layups from the wing, 10 attempts.', max: 10 },
  { id: 'layup_makes_left', label: 'Left-Hand Layups Made', unit: '/ 10', category: 'finishing', direction: 'higher', mean: 6, sd: 2.5, instructions: 'Live-speed left-hand layups from the wing, 10 attempts.', max: 10 },
  // ---- Passing ----
  { id: 'passing_accuracy', label: 'Passing Accuracy', unit: '/ 10', category: 'passing', direction: 'higher', mean: 7, sd: 2, instructions: 'Chest/bounce pass at a wall target 10 times from 15 feet. Record accurate hits.', max: 10 },
  // ---- Defense ----
  { id: 'defensive_slide_time', label: 'Defensive Slide Shuttle', unit: 'seconds', category: 'defense', direction: 'lower', mean: 12.5, sd: 1.5, instructions: 'Defensive slide through a 4-cone box pattern as fast as possible while staying low.' },
  { id: 'reaction_drill_time', label: 'Reaction/Mirror Drill', unit: 'seconds', category: 'defense', direction: 'lower', mean: 9, sd: 1.2, instructions: 'Partner mirror drill for 5 direction changes, timed start to finish.' },
  // ---- Athletic: speed ----
  { id: 'sprint_10yd', label: '10-Yard Sprint', unit: 'seconds', category: 'speed', direction: 'lower', mean: 1.9, sd: 0.15, instructions: 'Timed 10-yard sprint from a 3-point stance. Use a timing gate or video timing app if available.' },
  { id: 'sprint_20yd', label: '20-Yard Sprint', unit: 'seconds', category: 'speed', direction: 'lower', mean: 3.2, sd: 0.2, instructions: 'Timed 20-yard sprint from a 3-point stance.' },
  // ---- Athletic: vertical/explosiveness ----
  { id: 'vertical_jump', label: 'Vertical Jump', unit: 'inches', category: 'vertical', direction: 'higher', mean: 22, sd: 4, instructions: 'Standing reach, then max-effort vertical jump touch. Record the difference in inches. Use the same wall/device each time.' },
  { id: 'broad_jump', label: 'Standing Broad Jump', unit: 'inches', category: 'explosiveness', direction: 'higher', mean: 78, sd: 8, instructions: 'Standing broad jump, feet together, measure from takeoff line to nearest heel on landing.' },
  // ---- Conditioning ----
  { id: 'conditioning_score', label: '“17s” Conditioning Test', unit: 'reps completed', category: 'conditioning', direction: 'higher', mean: 12, sd: 4, instructions: 'Sprint sideline-to-sideline (17s) repeatedly within :60 windows. Record how many full reps completed with good form before failing to make the line in time.' },
  // ---- Strength (bodyweight-first, no maximal lifts required) ----
  { id: 'pushups_60s', label: 'Push-Ups in 60 Seconds', unit: 'reps', category: 'strength', direction: 'higher', mean: 30, sd: 8, instructions: 'Max good-form push-ups in 60 seconds. No equipment required.' },
  { id: 'plank_hold', label: 'Plank Hold', unit: 'seconds', category: 'strength', direction: 'higher', mean: 75, sd: 25, instructions: 'Hold a front plank with good form as long as possible.' },
];

export function testsByCategory() {
  const map = {};
  for (const t of TESTS) {
    map[t.category] = map[t.category] || [];
    map[t.category].push(t);
  }
  return map;
}

// results: { testId: rawValue }
export function computeRatings(results, player) {
  const factor = combinedFactor(player);
  const categoryScores = {};
  for (const test of TESTS) {
    const raw = results[test.id];
    if (raw === undefined || raw === null || raw === '') continue;
    const rating = zRating(Number(raw), test.mean, test.sd, test.direction, factor);
    categoryScores[test.category] = categoryScores[test.category] || [];
    categoryScores[test.category].push(rating);
  }
  const ratings = {};
  const allCategories = ['shooting', 'ball_handling', 'finishing', 'passing', 'defense', 'speed', 'strength', 'vertical', 'explosiveness', 'conditioning'];
  for (const cat of allCategories) {
    const scores = categoryScores[cat];
    ratings[cat] = scores && scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 60; // neutral default if untested
  }
  const ovr = Math.round(Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length);
  return { ratings, ovr: Math.max(40, Math.min(99, ovr)) };
}

export function ratingLabel(category) {
  const labels = {
    shooting: 'Shooting',
    ball_handling: 'Ball Handling',
    finishing: 'Finishing',
    passing: 'Passing',
    defense: 'Defense',
    speed: 'Speed',
    strength: 'Strength',
    vertical: 'Vertical',
    explosiveness: 'Explosiveness',
    conditioning: 'Conditioning',
  };
  return labels[category] || category;
}
