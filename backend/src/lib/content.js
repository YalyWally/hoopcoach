// Reference content library: drills, exercises, and category metadata.
// Each item lists the equipment it requires so the generator can filter
// to only what the player actually has access to.

export const SKILL_CATEGORIES = [
  'ball_handling',
  'shooting',
  'finishing',
  'passing',
  'defense',
  'decision_making',
];

export const GYM_CATEGORIES = [
  'lower_power',
  'upper_push',
  'upper_pull',
  'posterior_chain',
  'core',
];

export const FIELD_CATEGORIES = [
  'sprint_mechanics',
  'acceleration',
  'max_velocity',
  'agility_cod',
  'reaction',
  'jumping_plyo',
  'conditioning',
];

// goal key -> categories it should pull training time toward, per day type
export const GOAL_TO_SKILL_CATEGORY = {
  shooting: ['shooting'],
  ball_handling: ['ball_handling'],
  finishing: ['finishing'],
  passing: ['passing'],
  defense: ['defense'],
  overall_performance: ['ball_handling', 'shooting', 'finishing', 'passing', 'defense', 'decision_making'],
};

export const GOAL_TO_GYM_CATEGORY = {
  strength: ['lower_power', 'upper_push', 'upper_pull', 'posterior_chain'],
  gain_muscle: ['upper_push', 'upper_pull', 'posterior_chain', 'core'],
  vertical: ['lower_power', 'posterior_chain'],
  explosiveness: ['lower_power', 'posterior_chain', 'core'],
};

export const GOAL_TO_FIELD_CATEGORY = {
  speed: ['sprint_mechanics', 'acceleration', 'max_velocity'],
  vertical: ['jumping_plyo'],
  explosiveness: ['jumping_plyo', 'acceleration'],
  conditioning: ['conditioning'],
  defense: ['agility_cod', 'reaction'],
};

// ---- Basketball skill drills ----
// equipment keys: basketball, hoop, gym, dumbbells, barbells, machines, bands,
// plyo_boxes, cones, agility_ladder, sprint_area, track, other
export const SKILL_DRILLS = [
  // ball handling
  { key: 'stationary_two_ball', name: 'Two-Ball Stationary Pound Series', category: 'ball_handling', equipment: ['basketball'], intensity: 'low', desc: 'Simultaneous two-ball dribbling: pounds, alternating, crossovers at chest height.' },
  { key: 'combo_moves_cones', name: 'Combo Moves Through Cones', category: 'ball_handling', equipment: ['basketball', 'cones'], intensity: 'medium', desc: 'Crossover, between-the-legs, and behind-the-back combos attacking a line of cones.' },
  { key: 'live_ball_change_of_direction', name: 'Live-Ball Change of Direction', category: 'ball_handling', equipment: ['basketball'], intensity: 'medium', desc: 'Full-speed change-of-direction dribble moves the length of the floor.' },
  { key: 'tight_space_moves', name: 'Tight-Space 1v0 Moves', category: 'ball_handling', equipment: ['basketball', 'cones'], intensity: 'medium', desc: 'Attacking imaginary or cone defenders in a confined space with hesitations and shifts.' },
  { key: 'weak_hand_series', name: 'Weak-Hand Only Series', category: 'ball_handling', equipment: ['basketball'], intensity: 'low', desc: 'All dribble moves performed exclusively with the non-dominant hand.' },
  // shooting
  { key: 'form_shooting', name: 'Form Shooting (Close Range)', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'low', desc: 'One-hand and form-focused reps from inside the paint to groove mechanics.' },
  { key: 'spot_shooting', name: 'Spot-Up Shooting Circuit', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Catch-and-shoot reps from 5 spots around the arc, tracking makes/attempts.' },
  { key: 'off_dribble_pullups', name: 'Off-the-Dribble Pull-Ups', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'One and two-dribble pull-up jumpers off the dribble from both directions.' },
  { key: 'movement_shooting', name: 'Movement Shooting (Relocate & Fire)', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'high', desc: 'Shoot, sprint to a new spot, catch and shoot again — simulating game relocation.' },
  { key: 'free_throw_routine', name: 'Free Throw Routine Under Fatigue', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'low', desc: 'Free throws with a consistent pre-shot routine, tracked makes out of attempts.' },
  { key: 'three_point_progression', name: 'Three-Point Progression', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Five-spot three-point shooting with makes tracked per spot.' },
  { key: 'pick_and_pop', name: 'Pick-and-Pop Catch-and-Shoot', category: 'shooting', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Screen simulation then pop to the perimeter for a catch-and-shoot jumper.', positions: ['Power Forward', 'Center'] },
  // finishing
  { key: 'mikan_layup', name: 'Mikan Drill', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'low', desc: 'Alternating hand layups directly under the basket for touch and footwork.' },
  { key: 'live_finishing_angles', name: 'Live-Speed Finishing (Multiple Angles)', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'high', desc: 'Full-speed drives finishing from both wings and the middle, both hands.' },
  { key: 'contact_finishing', name: 'Finishing Through Contact', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'high', desc: 'Controlled-contact finishes (pad or partner contact) to build strength through the shot.' },
  { key: 'euro_step_series', name: 'Euro-Step & Floater Series', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Advanced finishing moves at game speed: euro-step, floater, reverse layup.' },
  { key: 'post_moves', name: 'Back-to-the-Basket Post Moves', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Drop step, up-and-under, and jump hook footwork from the post.', positions: ['Power Forward', 'Center'] },
  { key: 'offensive_rebound_finish', name: 'Offensive Rebound & Put-Back', category: 'finishing', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Timing and finishing put-backs off a tossed miss, both hands.', positions: ['Power Forward', 'Center'] },
  // passing
  { key: 'wall_passing', name: 'Wall Passing Accuracy', category: 'passing', equipment: ['basketball'], intensity: 'low', desc: 'Chest, bounce, and overhead passes against a wall for accuracy and speed.' },
  { key: 'pressure_passing', name: 'Pressure Passing Reads', category: 'passing', equipment: ['basketball', 'cones'], intensity: 'medium', desc: 'Passing decisions under simulated defensive pressure and closeouts.' },
  { key: 'live_dribble_passing', name: 'Live-Dribble Kick-Out Passing', category: 'passing', equipment: ['basketball'], intensity: 'medium', desc: 'Drive-and-kick passing at game speed to a moving target.' },
  // defense
  { key: 'defensive_slides', name: 'Defensive Slide Ladder', category: 'defense', equipment: ['agility_ladder'], intensity: 'medium', desc: 'Lateral defensive slide patterns through the agility ladder.' },
  { key: 'closeout_technique', name: 'Closeout Technique & Contest', category: 'defense', equipment: ['basketball', 'cones'], intensity: 'medium', desc: 'Sprint closeouts under control into a contest position.' },
  { key: 'mirror_drill', name: 'Mirror Reaction Drill', category: 'defense', equipment: ['cones'], intensity: 'medium', desc: 'Partner or cone mirror drill for lateral quickness and reaction.' },
  { key: 'onball_containment', name: '1v1 On-Ball Containment', category: 'defense', equipment: ['basketball'], intensity: 'high', desc: 'Live 1v1 reps focused purely on containing the dribble.' },
  // decision making / game-speed
  { key: 'small_sided_games', name: 'Small-Sided Live Reps', category: 'decision_making', equipment: ['basketball', 'hoop'], intensity: 'high', desc: '1v1 / 2v2 live reps forcing real-time decisions under defense.' },
  { key: 'random_read_react', name: 'Random Read & React Series', category: 'decision_making', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Coach/partner calls out a defensive coverage; player reacts with the correct read.' },
  { key: 'pnr_reads', name: 'Pick-and-Roll Read Progression', category: 'decision_making', equipment: ['basketball', 'hoop'], intensity: 'medium', desc: 'Ball-handler reads (attack, pull, reject) off a simulated screen.' },
];

// ---- Gym exercises ----
export const GYM_EXERCISES = [
  // lower power
  { key: 'back_squat', name: 'Back Squat', category: 'lower_power', equipment: ['barbells'], type: 'compound', sets: 4, reps: '5', tempo: '2-0-1' },
  { key: 'goblet_squat', name: 'Goblet Squat', category: 'lower_power', equipment: ['dumbbells'], type: 'compound', sets: 3, reps: '8-10', tempo: '2-0-1' },
  { key: 'bodyweight_squat_jump', name: 'Bodyweight Squat + Jump', category: 'lower_power', equipment: [], type: 'power', sets: 3, reps: '6', tempo: 'explosive' },
  { key: 'trap_bar_deadlift', name: 'Trap Bar Deadlift', category: 'lower_power', equipment: ['barbells'], type: 'compound', sets: 4, reps: '4-6', tempo: 'controlled' },
  { key: 'split_squat', name: 'Bulgarian Split Squat', category: 'lower_power', equipment: ['dumbbells'], type: 'unilateral', sets: 3, reps: '8 each', tempo: '2-0-1' },
  { key: 'box_jump', name: 'Box Jump', category: 'lower_power', equipment: ['plyo_boxes'], type: 'power', sets: 4, reps: '4', tempo: 'explosive' },
  { key: 'leg_press', name: 'Leg Press', category: 'lower_power', equipment: ['machines'], type: 'compound', sets: 3, reps: '8-10', tempo: 'controlled' },
  { key: 'band_squat', name: 'Band-Resisted Squat', category: 'lower_power', equipment: ['bands'], type: 'compound', sets: 3, reps: '12-15', tempo: 'controlled' },
  // upper push
  { key: 'bench_press', name: 'Barbell Bench Press', category: 'upper_push', equipment: ['barbells'], type: 'compound', sets: 4, reps: '6-8', tempo: 'controlled' },
  { key: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', category: 'upper_push', equipment: ['dumbbells'], type: 'compound', sets: 3, reps: '8-10', tempo: 'controlled' },
  { key: 'pushup', name: 'Push-Up Progression', category: 'upper_push', equipment: [], type: 'compound', sets: 3, reps: '10-15', tempo: 'controlled' },
  { key: 'band_press', name: 'Band Chest Press', category: 'upper_push', equipment: ['bands'], type: 'compound', sets: 3, reps: '12-15', tempo: 'controlled' },
  { key: 'machine_chest_press', name: 'Machine Chest Press', category: 'upper_push', equipment: ['machines'], type: 'compound', sets: 3, reps: '8-10', tempo: 'controlled' },
  // upper pull
  { key: 'pullup', name: 'Pull-Up / Assisted Pull-Up', category: 'upper_pull', equipment: [], type: 'compound', sets: 3, reps: '6-10', tempo: 'controlled' },
  { key: 'db_row', name: 'Single-Arm Dumbbell Row', category: 'upper_pull', equipment: ['dumbbells'], type: 'unilateral', sets: 3, reps: '10 each', tempo: 'controlled' },
  { key: 'band_row', name: 'Band Row', category: 'upper_pull', equipment: ['bands'], type: 'compound', sets: 3, reps: '12-15', tempo: 'controlled' },
  { key: 'lat_pulldown', name: 'Lat Pulldown', category: 'upper_pull', equipment: ['machines'], type: 'compound', sets: 3, reps: '8-10', tempo: 'controlled' },
  { key: 'barbell_row', name: 'Barbell Bent-Over Row', category: 'upper_pull', equipment: ['barbells'], type: 'compound', sets: 4, reps: '6-8', tempo: 'controlled' },
  // posterior chain
  { key: 'rdl', name: 'Romanian Deadlift', category: 'posterior_chain', equipment: ['barbells'], type: 'compound', sets: 3, reps: '8', tempo: '3-0-1' },
  { key: 'db_rdl', name: 'Dumbbell RDL', category: 'posterior_chain', equipment: ['dumbbells'], type: 'compound', sets: 3, reps: '10', tempo: '3-0-1' },
  { key: 'glute_bridge', name: 'Single-Leg Glute Bridge', category: 'posterior_chain', equipment: [], type: 'unilateral', sets: 3, reps: '12 each', tempo: 'controlled' },
  { key: 'nordic_curl', name: 'Nordic Hamstring Curl (assisted)', category: 'posterior_chain', equipment: [], type: 'eccentric', sets: 3, reps: '5-6', tempo: 'slow eccentric' },
  { key: 'band_pull_through', name: 'Band Pull-Through', category: 'posterior_chain', equipment: ['bands'], type: 'compound', sets: 3, reps: '12-15', tempo: 'controlled' },
  // core
  { key: 'pallof_press', name: 'Pallof Press', category: 'core', equipment: ['bands'], type: 'anti-rotation', sets: 3, reps: '10 each', tempo: 'controlled' },
  { key: 'plank_series', name: 'Plank + Side Plank Series', category: 'core', equipment: [], type: 'isometric', sets: 3, reps: '30-45s', tempo: 'hold' },
  { key: 'hanging_knee_raise', name: 'Hanging Knee Raise', category: 'core', equipment: [], type: 'flexion', sets: 3, reps: '10-12', tempo: 'controlled' },
  { key: 'med_ball_rotation', name: 'Medicine Ball Rotational Throw', category: 'core', equipment: ['other'], type: 'power', sets: 3, reps: '6 each', tempo: 'explosive' },
];

// ---- Field / athletic drills ----
export const FIELD_DRILLS = [
  { key: 'aline_march', name: 'A-Skip / A-March Series', category: 'sprint_mechanics', equipment: [], intensity: 'low', desc: 'Sprint mechanics drills reinforcing posture, knee drive, and arm action.' },
  { key: 'wall_drive', name: 'Wall Drive Drill', category: 'sprint_mechanics', equipment: [], intensity: 'low', desc: 'Acceleration posture and drive-phase mechanics against a wall.' },
  { key: 'start_starts', name: '10-Yard Acceleration Starts', category: 'acceleration', equipment: ['sprint_area'], intensity: 'high', desc: 'Explosive starts from a variety of stances over 10 yards, full recovery between reps.' },
  { key: 'flying_20s', name: 'Flying 20-Yard Sprints', category: 'max_velocity', equipment: ['sprint_area'], intensity: 'high', desc: 'Build-up into a 20-yard maximal-velocity sprint with full recovery.' },
  { key: 'timed_sprint_test', name: '10 & 20-Yard Timed Sprints', category: 'max_velocity', equipment: ['sprint_area'], intensity: 'high', desc: 'Timed sprint reps used for both training and performance tracking.' },
  { key: 'track_intervals', name: 'Track Repeat Sprints', category: 'max_velocity', equipment: ['track'], intensity: 'high', desc: 'Repeated maximal sprints on a track with full recovery between reps.' },
  { key: 'ladder_agility', name: 'Agility Ladder Patterns', category: 'agility_cod', equipment: ['agility_ladder'], intensity: 'medium', desc: 'Quick-feet ladder patterns building rhythm and coordination.' },
  { key: 'cone_cod', name: '5-10-5 & Cone Change-of-Direction', category: 'agility_cod', equipment: ['cones'], intensity: 'high', desc: 'Multi-directional cone drills training deceleration and redirection.' },
  { key: 'reactive_shuffle', name: 'Reactive Shuffle (Visual Cue)', category: 'reaction', equipment: ['cones'], intensity: 'medium', desc: 'Lateral shuffle reacting to a partner or coach visual cue.' },
  { key: 'reaction_ball', name: 'Reaction Ball Drill', category: 'reaction', equipment: ['other'], intensity: 'low', desc: 'Unpredictable-bounce reaction ball drill for quickness.' },
  { key: 'depth_jump', name: 'Depth Jump', category: 'jumping_plyo', equipment: ['plyo_boxes'], intensity: 'high', desc: 'Step-off depth jumps focused on minimal ground-contact time.' },
  { key: 'box_jump_series', name: 'Box Jump Series', category: 'jumping_plyo', equipment: ['plyo_boxes'], intensity: 'high', desc: 'Progressive box jump heights for vertical power.' },
  { key: 'broad_jump_series', name: 'Broad Jump Series', category: 'jumping_plyo', equipment: [], intensity: 'medium', desc: 'Standing broad jumps for horizontal power, tracked for distance.' },
  { key: 'approach_vertical', name: 'Approach Vertical Jump Practice', category: 'jumping_plyo', equipment: [], intensity: 'high', desc: 'Approach-and-jump technique work aimed directly at vertical leap.' },
  { key: 'shuttle_conditioning', name: 'Shuttle Run Conditioning', category: 'conditioning', equipment: ['cones'], intensity: 'high', desc: 'Repeated shuttle runs matching basketball work-to-rest ratios.' },
  { key: 'interval_conditioning', name: 'Interval Conditioning (Run/Walk)', category: 'conditioning', equipment: [], intensity: 'medium', desc: 'Work-to-rest interval running to build aerobic and anaerobic capacity.' },
  { key: 'suicide_conditioning', name: 'Suicides / Line Sprints', category: 'conditioning', equipment: [], intensity: 'high', desc: 'Classic line-sprint conditioning matched to game-length efforts.' },
];

export const RECOVERY_ACTIVITIES = [
  { key: 'mobility_flow', name: 'Full-Body Mobility Flow', durationMin: 15, desc: 'Hips, ankles, thoracic spine, and shoulders mobility sequence.' },
  { key: 'foam_rolling', name: 'Foam Rolling / Self-Myofascial Release', durationMin: 10, desc: 'Rolling major muscle groups used heavily in recent sessions.' },
  { key: 'light_stretch', name: 'Light Static Stretching', durationMin: 10, desc: 'Gentle static stretches held 30-45s per muscle group.' },
  { key: 'walk_recovery', name: 'Easy Walk / Active Recovery', durationMin: 20, desc: 'Low-intensity movement to promote blood flow without added fatigue.' },
];

// Small nudges toward positional priorities. These blend into (not replace)
// the player's own goal-driven weighting.
export const POSITION_SKILL_BOOST = {
  'Point Guard': { ball_handling: 0.1, passing: 0.08, decision_making: 0.05 },
  'Shooting Guard': { shooting: 0.12 },
  'Small Forward': { shooting: 0.06, finishing: 0.06, defense: 0.04 },
  'Power Forward': { finishing: 0.1, defense: 0.05 },
  'Center': { finishing: 0.12, defense: 0.06 },
};

export const POSITION_GYM_BOOST = {
  'Point Guard': {},
  'Shooting Guard': { core: 0.04 },
  'Small Forward': { upper_push: 0.03, posterior_chain: 0.03 },
  'Power Forward': { lower_power: 0.06, posterior_chain: 0.05 },
  'Center': { lower_power: 0.08, posterior_chain: 0.06 },
};

export function allEquipmentKeys() {
  return ['basketball', 'hoop', 'gym', 'dumbbells', 'barbells', 'machines', 'bands', 'plyo_boxes', 'cones', 'agility_ladder', 'sprint_area', 'track', 'other'];
}

export function hasEquipment(playerEquipment, required) {
  if (!required || required.length === 0) return true;
  return required.every((r) => playerEquipment.includes(r));
}
