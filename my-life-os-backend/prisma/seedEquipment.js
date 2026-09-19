const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const equipmentData = [
  {
    name: 'Lat Pulldown Machine',
    aliases: ['Lat Pulldown', 'Pulldown Machine', 'Cable Pulldown', 'Wide Grip Pulldown Machine', 'High Lat Pull'],
    category: 'Pin-Loaded / Cable',
    description: 'A dedicated upper-body cable machine designed to develop the latissimus dorsi, rhomboids, and biceps through vertical pulling motions.',
    primaryMuscles: ['Lats (Latissimus Dorsi)', 'Upper Back'],
    secondaryMuscles: ['Biceps', 'Rear Deltoids', 'Rhomboids', 'Forearms'],
    setupInstructions: [
      'Adjust the thigh pads so your legs fit snugly underneath with feet flat on the floor.',
      'Select an appropriate weight on the pin-loaded stack using the selector pin.',
      'Reach up and grip the wide bar with an overhand grip slightly wider than shoulder-width.',
      'Sit down with your thighs locked securely under the pads before initiating the pull.'
    ],
    instructions: [
      'Sit tall with your chest lifted, slight arch in your lower back, and core braced.',
      'Retract your shoulder blades downward and back.',
      'Pull the bar down smoothly toward your upper chest/collarbone by driving your elbows down and back.',
      'Squeeze your lats hard at the bottom position for 1 second without leaning backward excessively.',
      'Control the ascent as the bar slowly returns to the top until your arms and lats are fully stretched.'
    ],
    safetyInstructions: [
      'Never pull the bar behind your neck, as this puts extreme mechanical stress on the cervical spine and rotator cuff.',
      'Do not use excessive body momentum or swing your torso backward to heave the weight.',
      'Ensure the selector pin is fully inserted into the weight stack hole.'
    ],
    commonMistakes: [
      'Leaning too far back and turning the pulldown into a seated row.',
      'Pulling the bar too low past the sternum, flaring elbows backward.',
      'Letting the weight stack slam on the eccentric return.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Wide-Grip Lat Pulldown',
        category: 'Strength',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Lats',
        secondaryMuscles: ['Biceps', 'Rhomboids', 'Middle Traps'],
        shortDescription: 'Classic vertical pulling movement prioritizing outer lat width and back thickness.',
        startingPosition: 'Seated tall with thighs snug under the pads, overhand grip 1.5x shoulder width, arms extended, torso upright with slight 10-degree lean.',
        executionTechnique: 'Depress scapulae, drive elbows straight down toward your ribs, touch the upper chest lightly, pause, and return with 3-second tempo.',
        breathingInstructions: 'Inhale on the stretch at the top; exhale forcefully as you pull the bar down toward your chest.',
        instructions: [
          'Grip the bar slightly wider than shoulder width with knuckles facing upward.',
          'Sit down and slide thighs under the support pads.',
          'Retract shoulder blades down and pull elbows toward hip pockets.',
          'Touch upper chest, pause for a second, and slowly control the weight back up.'
        ],
        commonMistakes: ['Pulling behind neck', 'Swinging backward', 'Incomplete lockout stretch'],
        safetyTips: ['Keep elbows under wrists', 'Maintain tight abdominal bracing'],
        recommendedSets: 4,
        recommendedReps: '10-12',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['back', 'pull', 'lats', 'wings', 'upper body'],
        alternatives: ['Close-Grip Pulldown', 'Assisted Pull-Up', 'Dumbbell Row']
      },
      {
        name: 'Close-Grip Lat Pulldown',
        category: 'Hypertrophy',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Lats',
        secondaryMuscles: ['Biceps', 'Brachialis', 'Lower Lats'],
        shortDescription: 'Neutral close-grip variation putting the lats through a deeper stretch and engaging more lower lat fibers.',
        startingPosition: 'Attach V-bar or neutral close handle. Sit with knees locked under pads, arms fully extended overhead holding the handles.',
        executionTechnique: 'Pull the handle straight down to the mid-chest, squeezing the shoulder blades together, keeping elbows close to your torso.',
        breathingInstructions: 'Deep breath at the top stretch; exhale as you pull down and contract.',
        instructions: [
          'Attach a close-grip V-handle to the cable connector.',
          'Grasp the handles with palms facing each other.',
          'Pull smoothly down to upper chest level while keeping the torso steady.',
          'Slowly resist back up until elbows are extended.'
        ],
        commonMistakes: ['Rounding shoulders forward', 'Using momentum to yank the weight'],
        safetyTips: ['Keep your spine neutral throughout', 'Avoid jerking shoulders at the top'],
        recommendedSets: 3,
        recommendedReps: '10-12',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&auto=format&fit=crop&q=80',
        tags: ['back', 'lats', 'v-bar', 'close-grip'],
        alternatives: ['Wide-Grip Lat Pulldown', 'Seated Cable Row']
      }
    ]
  },
  {
    name: 'Cable Crossover',
    aliases: ['Cable Machine', 'Dual Cable Column', 'Cable Tower', 'Functional Trainer', 'Double Cable Machine'],
    category: 'Cable Machine',
    description: 'Versatile dual-pulley cable station featuring adjustable height sliders for multi-planar chest, shoulder, arm, and core movements.',
    primaryMuscles: ['Chest (Pectoralis Major)', 'Shoulders'],
    secondaryMuscles: ['Triceps', 'Biceps', 'Core'],
    setupInstructions: [
      'Adjust both pulley carriages to the desired height (top for decline flyes, chest-height for middle, bottom for incline flyes).',
      'Attach single D-handles to each carabiner.',
      'Select equal weight on both stacks.',
      'Take handles, step forward into a staggered stance to establish balance.'
    ],
    instructions: [
      'Stand in the center with one foot forward for stability and knees slightly bent.',
      'Keep a slight bend in your elbows throughout the movement to protect the joint.',
      'Bring your hands forward and together in a wide hugging arc across your chest.',
      'Squeeze your pecs tightly at peak contraction for 1 second.',
      'Slowly open your arms back until you feel a deep stretch in the chest.'
    ],
    safetyInstructions: [
      'Do not overstretch your shoulders behind your torso if you have previous rotator cuff irritation.',
      'Maintain continuous core engagement to prevent lumbar hyperextension.'
    ],
    commonMistakes: [
      'Turning the fly into a chest press by excessively bending and extending elbows.',
      'Using body momentum to swing the cables forward.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'High-to-Low Cable Fly',
        category: 'Hypertrophy',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Chest (Lower Pectorals)',
        secondaryMuscles: ['Front Delts', 'Core'],
        shortDescription: 'High pulley angle focusing on the lower sternal head of the pectoralis major.',
        startingPosition: 'Pulleys set above head height. Staggered stance, arms extended outward with slight elbow flexion.',
        executionTechnique: 'Sweep arms down and across in front of the hips, crossing wrists slightly for maximal contraction.',
        breathingInstructions: 'Inhale on the wide stretch; exhale on the downward hugging sweep.',
        instructions: [
          'Set pulleys high on the dual tower.',
          'Step forward into a staggered stance.',
          'Bring handles downward in a sweeping arc to meet at hip height.',
          'Return slowly under control.'
        ],
        commonMistakes: ['Pressing instead of flying', 'Bouncing at the stretch'],
        safetyTips: ['Keep shoulders back and chest up'],
        recommendedSets: 3,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        tags: ['chest', 'cable', 'fly', 'pecs'],
        alternatives: ['Pec Deck Fly', 'Dumbbell Fly']
      },
      {
        name: 'Triceps Rope Pushdown',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Triceps',
        secondaryMuscles: ['Forearms'],
        shortDescription: 'Isolation exercise using a rope attachment to target all three heads of the triceps brachii.',
        startingPosition: 'Attach rope to high pulley. Stand tall with slight forward hip hinge, elbows pinned firmly against ribcage.',
        executionTechnique: 'Extend forearms downward, flaring the rope outward at the bottom for intense triceps lockout.',
        breathingInstructions: 'Exhale as you push down to full lockout; inhale as you control the rope back up to elbow height.',
        instructions: [
          'Pin elbows by your sides.',
          'Push hands downward toward the floor.',
          'Spread the rope ends apart at the bottom for peak contraction.',
          'Resist upward until forearms reach parallel.'
        ],
        commonMistakes: ['Flaring elbows out', 'Letting elbows drift forward'],
        safetyTips: ['Do not shrug shoulders', 'Keep wrists straight'],
        recommendedSets: 4,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=80',
        tags: ['triceps', 'arms', 'pushdown', 'rope'],
        alternatives: ['Dips', 'Skull Crushers', 'Close-Grip Bench Press']
      }
    ]
  },
  {
    name: 'Seated Cable Row',
    aliases: ['Cable Row Machine', 'Low Cable Row', 'Seated Row', 'Horizontal Cable Row'],
    category: 'Cable Machine',
    description: 'Low pulley machine designed for horizontal pulling movements that build upper back thickness, mid-trapezius, and lats.',
    primaryMuscles: ['Middle Back (Rhomboids, Mid Traps)', 'Lats'],
    secondaryMuscles: ['Biceps', 'Rear Deltoids', 'Erector Spinae'],
    setupInstructions: [
      'Attach a close-grip V-handle or straight bar to the low pulley.',
      'Place feet securely on the footrests with knees slightly bent (never locked out).',
      'Sit upright with spine neutral and reach forward to grasp the handle.'
    ],
    instructions: [
      'Push back with legs slightly to lift the weight off the stack, keeping knees bent.',
      'Sit tall with chest high and shoulders depressed.',
      'Pull the handle toward your lower abdomen/navel, driving elbows backward.',
      'Pinch your shoulder blades tightly together at full contraction.',
      'Slowly extend arms forward with control, allowing shoulder blades to open without hunching lower back.'
    ],
    safetyInstructions: [
      'Never round your lumbar spine while reaching forward.',
      'Avoid swinging aggressively back and forth from the hips.'
    ],
    commonMistakes: [
      'Excessive backward lean (using lower back momentum).',
      'Shrugging shoulders up toward ears during the pull.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Seated Close-Grip Cable Row',
        category: 'Strength',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Upper Back',
        secondaryMuscles: ['Lats', 'Biceps', 'Rhomboids'],
        shortDescription: 'Staple horizontal pulling movement building central back density and posture.',
        startingPosition: 'Seated with feet on footplates, knees soft, spine upright, holding V-handle with extended arms.',
        executionTechnique: 'Retract scapulae and pull elbows back in line with torso, squeezing mid-back hard.',
        breathingInstructions: 'Exhale while pulling into your abdomen; inhale while smoothly extending arms back out.',
        instructions: [
          'Grab handle, push back to neutral seated position.',
          'Pull handle into lower abdomen.',
          'Squeeze shoulder blades for 1 count.',
          'Release smoothly back forward.'
        ],
        commonMistakes: ['Hyperextending spine', 'Using biceps more than back'],
        safetyTips: ['Keep abdominal wall tight', 'Keep knees bent slightly'],
        recommendedSets: 3,
        recommendedReps: '10-12',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&auto=format&fit=crop&q=80',
        tags: ['back', 'row', 'cable', 'thickness'],
        alternatives: ['Barbell Row', 'Dumbbell Row', 'Chest-Supported T-Bar Row']
      }
    ]
  },
  {
    name: 'Chest Press Machine',
    aliases: ['Seated Chest Press', 'Machine Bench Press', 'Horizontal Chest Press Machine', 'Pin-Loaded Chest Press'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Stabilized horizontal pressing machine that isolates the pectoral muscles and triceps with minimal stabilizer fatigue.',
    primaryMuscles: ['Chest (Pectoralis Major)'],
    secondaryMuscles: ['Front Deltoids', 'Triceps'],
    setupInstructions: [
      'Adjust seat height so the handles align directly with your mid-to-lower chest level.',
      'Ensure your feet are placed flat on the floor with knees at roughly 90 degrees.',
      'Adjust the backrest or start lever if equipped to achieve an initial comfortable stretch.'
    ],
    instructions: [
      'Sit firmly against backrest with upper back, shoulders, and hips pressed back.',
      'Grasp handles with knuckles forward and wrists straight.',
      'Press handles forward smoothly until arms are almost fully extended without locking elbows.',
      'Pause briefly and squeeze your chest.',
      'Lower the handles back slowly under control until hands are level with chest.'
    ],
    safetyInstructions: [
      'Do not let elbows drift back too far behind the torso to prevent shoulder capsule impingement.',
      'Keep shoulder blades pinched back against the pad throughout the press.'
    ],
    commonMistakes: [
      'Allowing shoulders to roll forward off the pad during the press.',
      'Setting seat too low causing handles to be at neck height.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Machine Chest Press',
        category: 'Strength',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Chest',
        secondaryMuscles: ['Triceps', 'Front Delts'],
        shortDescription: 'Controlled pressing motion that safely overloads the pectorals without balance demands.',
        startingPosition: 'Seated upright, handles at nipple line, elbows at 45-degree angle to torso.',
        executionTechnique: 'Press smoothly forward through the palms, keeping back and head against the cushion.',
        breathingInstructions: 'Exhale as you push forward; inhale as you slowly return.',
        instructions: [
          'Sit firmly with feet planted.',
          'Grip handles firmly.',
          'Drive forward until arms are straight but not hyperextended.',
          'Control the return for 2-3 seconds.'
        ],
        commonMistakes: ['Flaring elbows to 90 degrees', 'Shrugging traps'],
        safetyTips: ['Keep wrists aligned with forearms'],
        recommendedSets: 4,
        recommendedReps: '8-12',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['chest', 'push', 'press', 'pecs'],
        alternatives: ['Barbell Bench Press', 'Dumbbell Bench Press', 'Push-Ups']
      }
    ]
  },
  {
    name: 'Pec Deck',
    aliases: ['Pec Fly Machine', 'Butterfly Machine', 'Pec Deck Machine', 'Rear Delt Pec Deck', 'Seated Fly Machine'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Specialized machine designed for chest isolation (flyes) and rear deltoid isolation via rotating lever arms.',
    primaryMuscles: ['Chest (Pectoralis Major)', 'Rear Deltoids'],
    secondaryMuscles: ['Front Delts', 'Rhomboids (Reverse Fly)'],
    setupInstructions: [
      'Adjust seat height so handles/pads are at mid-chest height.',
      'Adjust the arm angle pins to position arms slightly behind the chest for a mild stretch.',
      'For rear delts, face the pad and set arms to the rear pin position.'
    ],
    instructions: [
      'Sit with back flat against the pad.',
      'Place forearms on pads or grasp handles with elbows slightly bent.',
      'Bring handles together in front of your chest in a sweeping circular arc.',
      'Squeeze chest muscles hard for 1-2 seconds at the peak.',
      'Slowly open arms back to starting position without letting weights clash.'
    ],
    safetyInstructions: [
      'Avoid setting starting pin too far back if your shoulder mobility is restricted.',
      'Keep your head back on the rest and spine neutral.'
    ],
    commonMistakes: [
      'Pressing with hands rather than adducting through elbows.',
      'Letting the weight pull shoulders into painful hyperextension.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Pec Deck Chest Fly',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Chest',
        secondaryMuscles: ['Front Delts'],
        shortDescription: 'Pure chest isolation removing triceps involvement to focus entirely on pectoral contraction.',
        startingPosition: 'Seated facing away from machine, elbows slightly bent, hands on levers at mid-chest level.',
        executionTechnique: 'Sweep arms together like hugging a large barrel, squeeze pecs, and return slowly.',
        breathingInstructions: 'Exhale as handles touch; inhale as arms open back up.',
        instructions: [
          'Sit tall, chest out.',
          'Grip handles and bring them together in front.',
          'Hold 1 second squeeze.',
          'Return slowly until gentle stretch is felt.'
        ],
        commonMistakes: ['Rushing reps', 'Shoulders rolling forward'],
        safetyTips: ['Do not overstretch shoulder joint'],
        recommendedSets: 3,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
        tags: ['chest', 'isolation', 'pecs', 'fly'],
        alternatives: ['Cable Crossover', 'Dumbbell Fly']
      },
      {
        name: 'Reverse Pec Deck Fly',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Rear Deltoids',
        secondaryMuscles: ['Rhomboids', 'Trapezius'],
        shortDescription: 'Rear deltoid and upper back isolation performed by facing inward toward the pad.',
        startingPosition: 'Facing the pad, chest against support, arms straight ahead holding handles with palms down or neutral.',
        executionTechnique: 'Drive hands outward and backward in a horizontal arc until arms are in line with shoulders.',
        breathingInstructions: 'Exhale as you drive arms backward; inhale on the return.',
        instructions: [
          'Sit facing the pad with chest supported.',
          'Grasp handles at shoulder height.',
          'Pull arms outward and back, focusing on rear shoulders.',
          'Control the return.'
        ],
        commonMistakes: ['Using lower back to swing', 'Shrugging upper traps'],
        safetyTips: ['Keep elbows slightly soft, not locked'],
        recommendedSets: 4,
        recommendedReps: '15-20',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&auto=format&fit=crop&q=80',
        tags: ['shoulders', 'rear delts', 'posture', 'back'],
        alternatives: ['Face Pull', 'Dumbbell Reverse Fly']
      }
    ]
  },
  {
    name: 'Shoulder Press Machine',
    aliases: ['Seated Overhead Press Machine', 'Machine Overhead Press', 'Shoulder Press'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Vertical pressing machine for building the anterior and lateral deltoids and triceps with fixed-track stability.',
    primaryMuscles: ['Shoulders (Anterior & Lateral Deltoids)'],
    secondaryMuscles: ['Triceps', 'Upper Traps', 'Upper Chest'],
    setupInstructions: [
      'Adjust seat height so handles start level with or slightly above your chin/ear height.',
      'Select appropriate weight stack pin.',
      'Choose neutral (palms facing each other) or pronated (palms forward) grip based on shoulder comfort.'
    ],
    instructions: [
      'Sit tall with head, upper back, and glutes against backrest.',
      'Grasp handles firmly with wrists upright.',
      'Press upward overhead smoothly until arms are almost fully extended.',
      'Pause momentarily at the top without shrugging shoulders to ears.',
      'Lower under control to ear level.'
    ],
    safetyInstructions: [
      'Do not arch your lower back off the pad to push the weight up.',
      'If you have shoulder impingement, use the neutral grip handles.'
    ],
    commonMistakes: ['Excessive back arching', 'Locking elbows aggressively'],
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Machine Overhead Shoulder Press',
        category: 'Strength',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Shoulders',
        secondaryMuscles: ['Triceps', 'Upper Trapezius'],
        shortDescription: 'Safe, guided vertical press targeting the front and side deltoids.',
        startingPosition: 'Seated upright, handles at ear height, feet flat on the floor.',
        executionTechnique: 'Press straight overhead until elbows reach near-extension, lower slowly to ear height.',
        breathingInstructions: 'Exhale during the overhead press; inhale on the downward descent.',
        instructions: [
          'Sit back against pad.',
          'Grasp handles.',
          'Drive weight upward.',
          'Lower smoothly.'
        ],
        commonMistakes: ['Arching spine', 'Short range of motion'],
        safetyTips: ['Keep lower back pressed against support'],
        recommendedSets: 4,
        recommendedReps: '8-10',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=80',
        tags: ['shoulders', 'press', 'delts', 'upper body'],
        alternatives: ['Dumbbell Shoulder Press', 'Barbell Military Press']
      }
    ]
  },
  {
    name: 'Leg Press',
    aliases: ['45 Degree Leg Press', 'Incline Leg Press', 'Sled Leg Press', 'Leg Press Machine'],
    category: 'Plate-Loaded',
    description: 'Heavy compound lower-body sled machine allowing safe quadriceps, hamstring, and glute overload with back support.',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Calves'],
    setupInstructions: [
      'Load Olympic weight plates evenly on both carriage horns.',
      'Sit with back and hips firmly pressed against the angled pad.',
      'Place feet shoulder-width apart in the center of the sled platform.'
    ],
    instructions: [
      'Disengage the safety support handles by pressing the sled slightly and rotating levers outward.',
      'Lower the sled slowly by bending knees toward your armpits until knees reach approximately 90 degrees.',
      'Do not allow lower back or tailbone to round off the seat pad.',
      'Drive powerfully through your heels and midfoot to push the sled back up.',
      'Stop just short of full knee lockout to maintain muscular tension and protect knees.'
    ],
    safetyInstructions: [
      'NEVER lock your knees out forcefully at the top under heavy loads.',
      'Do not allow your pelvis/tailbone to curl off the bottom pad at the lowest point (prevents lumbar disc herniation).',
      'Always keep safety catches in place when not actively pressing.'
    ],
    commonMistakes: [
      'Hyperextending and snapping knees at the lockout.',
      'Knees caving inward (valgus collapse) during the press.',
      'Bouncing the sled off the bottom stops.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: '45-Degree Incline Leg Press',
        category: 'Strength',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Quadriceps',
        secondaryMuscles: ['Glutes', 'Hamstrings'],
        shortDescription: 'Mass-building compound lower body exercise with lower spinal compression than free squats.',
        startingPosition: 'Seated in sled with feet shoulder-width apart, toes slightly angled out, safety released.',
        executionTechnique: 'Descend under 3-second control to 90 degrees knee flexion, drive up through midfoot and heel.',
        breathingInstructions: 'Inhale deeply during sled descent; exhale forcefully while pressing sled back up.',
        instructions: [
          'Position feet middle of plate shoulder-width.',
          'Release safety handles.',
          'Lower sled until knees form 90 degrees.',
          'Press back up without snapping knees.'
        ],
        commonMistakes: ['Locking knees', 'Lifting hips off seat'],
        safetyTips: ['Always keep handles held', 'Keep knees tracking over toes'],
        recommendedSets: 4,
        recommendedReps: '10-12',
        recommendedRestSec: 120,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'quads', 'press', 'glutes'],
        alternatives: ['Barbell Squat', 'Hack Squat', 'Goblet Squat']
      }
    ]
  },
  {
    name: 'Leg Extension',
    aliases: ['Leg Extension Machine', 'Seated Leg Extension', 'Quad Extension Machine'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Isolation machine isolating the four quadriceps muscles through knee extension.',
    primaryMuscles: ['Quadriceps (Rectus Femoris, Vastus Medialis/Lateralis)'],
    secondaryMuscles: [],
    setupInstructions: [
      'Adjust backrest so the pivot point of the machine aligns directly with your knee joint.',
      'Adjust shin pad so it rests comfortably on lower shins just above the ankles.',
      'Sit firmly with thighs flat on seat and grip the side stabilization handles.'
    ],
    instructions: [
      'Sit back against pad and grip side handles.',
      'Extend knees smoothly until legs are straight out in front.',
      'Hold the contraction for 1 second at the peak to maximize quad activation.',
      'Lower the weight slowly under 2-3 seconds back to starting position.'
    ],
    safetyInstructions: [
      'Do not kick or jerk the weight up with momentum.',
      'If you have patellofemoral knee pain, avoid hyper-extending the top 10 degrees.'
    ],
    commonMistakes: ['Swinging weight up', 'Lifting hips off the seat'],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Seated Leg Extension',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Quadriceps',
        secondaryMuscles: [],
        shortDescription: 'Pure quadriceps isolation exercise emphasizing peak knee extension contraction.',
        startingPosition: 'Seated with back supported, knees aligned with axis, pad on lower shins.',
        executionTechnique: 'Smoothly extend legs upward, hold 1 second squeeze, lower with control.',
        breathingInstructions: 'Exhale extending legs up; inhale as you lower the weight.',
        instructions: [
          'Grip side handles.',
          'Extend legs fully straight.',
          'Hold 1 second squeeze.',
          'Control descent for 3 seconds.'
        ],
        commonMistakes: ['Jerking shins', 'Fast dropping'],
        safetyTips: ['Keep back firmly against seat'],
        recommendedSets: 3,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'quads', 'isolation', 'extension'],
        alternatives: ['Sissy Squat', 'Goblet Squat', 'Walking Lunges']
      }
    ]
  },
  {
    name: 'Leg Curl',
    aliases: ['Lying Leg Curl', 'Seated Leg Curl', 'Hamstring Curl Machine', 'Prone Leg Curl'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Specialized machine isolating the hamstring muscle group through active knee flexion against resistance.',
    primaryMuscles: ['Hamstrings (Biceps Femoris, Semitendinosus, Semimembranosus)'],
    secondaryMuscles: ['Calves (Gastrocnemius)'],
    setupInstructions: [
      'Lie face down on the bench with knee joints aligned with the machine pivot.',
      'Adjust roller pad to rest just below calves above Achilles tendons.',
      'Grip the forward handles and tuck pelvis into pad.'
    ],
    instructions: [
      'Grip handles firmly and keep hips pressed into the bench pad.',
      'Curl the roller pad upward toward your glutes by flexing hamstrings.',
      'Squeeze hamstrings hard at full flexion.',
      'Slowly extend legs back down under full muscular control.'
    ],
    safetyInstructions: [
      'Do not allow hips to raise up off the pad during the curl (hyperextends lumbar spine).',
      'Avoid hyperextending knees forcefully at the bottom.'
    ],
    commonMistakes: ['Lifting hips off bench', 'Swinging weights with lower back'],
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Lying Hamstring Curl',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Hamstrings',
        secondaryMuscles: ['Calves'],
        shortDescription: 'Classic prone hamstring isolation prioritizing the peak knee flexion contraction.',
        startingPosition: 'Prone on bench, pad behind lower calves, knees just off pad edge.',
        executionTechnique: 'Curl heels toward buttocks while keeping hips pinned to bench, lower with eccentric control.',
        breathingInstructions: 'Exhale while curling heels up; inhale as you slowly lower.',
        instructions: [
          'Lie prone, grab handles.',
          'Curl heels toward glutes.',
          'Pause 1 second.',
          'Lower smoothly.'
        ],
        commonMistakes: ['Arching lower back', 'Kicking momentum'],
        safetyTips: ['Keep toes pulled slightly toward shins (dorsiflexion)'],
        recommendedSets: 3,
        recommendedReps: '10-12',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'hamstrings', 'curls', 'posterior chain'],
        alternatives: ['Romanian Deadlift', 'Swiss Ball Leg Curl', 'Nordic Curl']
      }
    ]
  },
  {
    name: 'Smith Machine',
    aliases: ['Smith Rack', 'Guided Barbell Machine', 'Smith Press'],
    category: 'Guided Barbell',
    description: 'Fixed-track vertical barbell machine featuring safety lockout hooks for assisted squatting, pressing, and lunges.',
    primaryMuscles: ['Full Body (Quadriceps, Chest, Shoulders depending on exercise)'],
    secondaryMuscles: ['Glutes', 'Triceps'],
    setupInstructions: [
      'Adjust safety stopper pins at the bottom to prevent bar from dropping past your safe range.',
      'Rotate bar with wrists to unhook from safety pegs.',
      'Always ensure safety catches are set properly before lifting heavy.'
    ],
    instructions: [
      'Position yourself under the bar according to exercise (e.g., squat, press, hip thrust).',
      'Unhook bar by rotating wrists backward.',
      'Execute movement along the fixed linear rail with smooth cadence.',
      'Rotate bar forward at completion to re-latch safety hooks onto pegs.'
    ],
    safetyInstructions: [
      'Always set mechanical safety stops at minimum depth before starting any set.',
      'Never attempt max effort lifts without setting safety stops.'
    ],
    commonMistakes: ['Placing feet too far behind or forward', 'Forgetting to latch hooks securely'],
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Smith Machine Squat',
        category: 'Strength',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Quadriceps',
        secondaryMuscles: ['Glutes', 'Hamstrings'],
        shortDescription: 'Squat variation with stabilized balance allowing greater focus on quad depth and foot placement.',
        startingPosition: 'Bar resting on upper traps, feet slightly forward of bar plane, shoulder-width apart.',
        executionTechnique: 'Unhook bar, sit back into hips and knees to parallel, drive up through midfoot.',
        breathingInstructions: 'Deep breath at top; hold core brace during descent; exhale passing sticking point.',
        instructions: [
          'Place bar on upper traps.',
          'Rotate bar to unlatch.',
          'Squat to parallel.',
          'Drive up and lock latch when set ends.'
        ],
        commonMistakes: ['Relying on bar for total balance', 'Rounding back'],
        safetyTips: ['Set lower safety catches below parallel'],
        recommendedSets: 4,
        recommendedReps: '8-10',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'smith machine', 'squat', 'quads'],
        alternatives: ['Barbell Squat', 'Leg Press', 'Hack Squat']
      }
    ]
  },
  {
    name: 'Squat Rack',
    aliases: ['Power Rack', 'Power Cage', 'Squat Stand', 'Half Rack'],
    category: 'Free Weights / Rack',
    description: 'Heavy-duty steel frame with adjustable J-hooks and safety spotter arms for compound barbell lifting.',
    primaryMuscles: ['Full Body (Quadriceps, Hamstrings, Glutes, Back)'],
    secondaryMuscles: ['Core', 'Adductors', 'Calves'],
    setupInstructions: [
      'Set J-hooks at roughly collarbone height so you can unrack without going on tiptoes.',
      'Adjust horizontal safety spotter arms just below your lowest squat depth.',
      'Center the Olympic barbell on the hooks and secure plates with collars.'
    ],
    instructions: [
      'Step under bar, rest bar across traps (high bar or low bar position).',
      'Grip bar firmly, brace core, and stand up to unrack.',
      'Take two deliberate steps backward into your squat stance.',
      'Inhale deeply into your belly, sit hips back and down to parallel or below.',
      'Drive powerfully up through the midfoot to return to standing.'
    ],
    safetyInstructions: [
      'Always set safety spotter arms before squatting heavy loads.',
      'Always use spring or barbell locking collars on both sides.'
    ],
    commonMistakes: ['Setting J-hooks too high', 'Squatting outside safety bars'],
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Barbell Back Squat',
        category: 'Strength',
        difficultyLevel: 'Advanced',
        primaryMuscle: 'Quadriceps',
        secondaryMuscles: ['Glutes', 'Hamstrings', 'Lower Back', 'Core'],
        shortDescription: 'The king of lower-body compound lifts developing whole-body strength and leg power.',
        startingPosition: 'Barbell racked across upper traps, feet shoulder-width apart, toes turned 15-30 degrees outward.',
        executionTechnique: 'Brace core 360-degrees, descend until hip crease is below knee cap, drive up through feet.',
        breathingInstructions: 'Valsalva maneuver: deep breath & brace at top, hold through bottom, exhale near top.',
        instructions: [
          'Unrack bar with balanced stance.',
          'Take 2 steps back.',
          'Break at hips and knees simultaneously.',
          'Reach depth, drive upward through feet.'
        ],
        commonMistakes: ['Knees collapsing inward', 'Chest collapsing forward'],
        safetyTips: ['Never squat without spotter arms or partner'],
        recommendedSets: 4,
        recommendedReps: '6-8',
        recommendedRestSec: 120,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'squat', 'barbell', 'strength', 'quads'],
        alternatives: ['Front Squat', 'Leg Press', 'Hack Squat']
      }
    ]
  },
  {
    name: 'Barbell',
    aliases: ['Olympic Barbell', 'Olympic Bar', 'Standard Barbell', 'Straight Bar'],
    category: 'Free Weights',
    description: 'Standard 20kg (45lb) Olympic steel bar used for foundational free-weight compound exercises.',
    primaryMuscles: ['Full Body'],
    secondaryMuscles: ['Forearms', 'Core'],
    setupInstructions: [
      'Place bar on flat ground or rack pins.',
      'Load equal weight plates on both sleeves.',
      'Fasten bar clips or collars tightly on both ends.'
    ],
    instructions: [
      'Approach bar with feet placed hip-width or shoulder-width apart.',
      'Grip with double overhand, hook grip, or mixed grip based on exercise.',
      'Perform lift maintaining straight spine and braced abdominal wall.'
    ],
    safetyInstructions: [
      'Always verify weight clamps are securely fastened before lifting.',
      'Drop weights only on rubber bumper plates / Olympic platforms.'
    ],
    commonMistakes: ['Uneven loading', 'Lifting without collars'],
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Barbell Conventional Deadlift',
        category: 'Strength',
        difficultyLevel: 'Advanced',
        primaryMuscle: 'Lower Back & Hamstrings',
        secondaryMuscles: ['Glutes', 'Lats', 'Traps', 'Forearms'],
        shortDescription: 'Foundational posterior chain movement pulling loaded bar from the floor to hip lockout.',
        startingPosition: 'Feet hip-width apart under bar (bar over midfoot), shins touching bar, hips hinged back, chest tall.',
        executionTechnique: 'Take slack out of bar, drive feet through floor, extend hips and knees together, lock out standing tall.',
        breathingInstructions: 'Big diaphragmatic breath and brace at floor; exhale at full lockout.',
        instructions: [
          'Walk up to bar until shins are 1 inch away.',
          'Hinge down and grip outside knees.',
          'Pull chest up to set spine.',
          'Drive floor away and stand up tall.'
        ],
        commonMistakes: ['Rounding lower back', 'Yanking bar off floor without tension'],
        safetyTips: ['Keep bar close to body throughout the entire path'],
        recommendedSets: 3,
        recommendedReps: '5',
        recommendedRestSec: 150,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        tags: ['back', 'deadlift', 'posterior chain', 'strength', 'legs'],
        alternatives: ['Trap Bar Deadlift', 'Romanian Deadlift', 'Rack Pull']
      }
    ]
  },
  {
    name: 'Dumbbells',
    aliases: ['Free Weights', 'Dumbbell Pair', 'Hand Weights', 'Adjustable Dumbbells'],
    category: 'Free Weights',
    description: 'Independent handheld weights allowing natural joint freedom and unilateral training for upper and lower body.',
    primaryMuscles: ['Full Body'],
    secondaryMuscles: ['Stabilizers', 'Forearms', 'Core'],
    setupInstructions: [
      'Select matching weight dumbbells from the rack.',
      'Lift with bent knees from the rack to prevent back strain.',
      'Keep your workout area clear of other weights before starting.'
    ],
    instructions: [
      'Maintain firm neutral grip around the handle center.',
      'Perform controlled movement through complete range of motion.',
      'Avoid swinging or dropping dumbbells violently.'
    ],
    safetyInstructions: [
      'Do not drop dumbbells onto feet or gym floor.',
      'Keep wrists rigid and avoid excessive flexion or extension.'
    ],
    commonMistakes: ['Swinging weights using body momentum', 'Uneven balance'],
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Dumbbell Lateral Raise',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Lateral Deltoids',
        secondaryMuscles: ['Traps', 'Forearms'],
        shortDescription: 'Shoulder isolation movement creating shoulder width and roundness.',
        startingPosition: 'Standing tall with dumbbells at sides, slight forward torso lean, soft elbows.',
        executionTechnique: 'Raise dumbbells outward in the scapular plane until elbows reach shoulder height.',
        breathingInstructions: 'Exhale raising dumbbells up; inhale as you lower with control.',
        instructions: [
          'Stand with dumbbells at sides.',
          'Lead with elbows slightly forward.',
          'Raise to shoulder height.',
          'Lower under control for 2 seconds.'
        ],
        commonMistakes: ['Using momentum/shrugging', 'Raising higher than shoulders'],
        safetyTips: ['Do not go excessively heavy'],
        recommendedSets: 4,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
        tags: ['shoulders', 'lateral delts', 'isolation', 'dumbbells'],
        alternatives: ['Cable Lateral Raise', 'Machine Lateral Raise']
      }
    ]
  },
  {
    name: 'Adjustable Bench',
    aliases: ['Incline Bench', 'Flat Bench', 'Decline Bench', 'FID Bench', 'Workout Bench'],
    category: 'Free Weights / Support',
    description: 'Multi-position padded bench adjustable from flat to incline and upright angles for pressing and dumbbell rows.',
    primaryMuscles: ['Chest', 'Shoulders', 'Arms'],
    secondaryMuscles: ['Core'],
    setupInstructions: [
      'Pull pop-pin to adjust backrest angle (Flat 0°, Incline 30°-45°, Shoulder Press 75°-85°).',
      'Adjust seat angle slightly upward on inclines to prevent sliding forward.',
      'Ensure the pin clicks completely into the adjustment notch.'
    ],
    instructions: [
      'Lie or sit firmly on bench with head and back supported.',
      'Keep feet firmly planted on the floor for stability.',
      'Perform presses, curls, or flies with strict form.'
    ],
    safetyInstructions: [
      'Always verify adjustment locking pin is fully engaged before applying weight.',
      'Keep feet grounded at all times.'
    ],
    commonMistakes: ['Loose pin engagement', 'Incline set too steep turning chest press into shoulder press'],
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Incline Dumbbell Bench Press',
        category: 'Hypertrophy',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Upper Chest (Clavicular Pectoralis)',
        secondaryMuscles: ['Front Delts', 'Triceps'],
        shortDescription: 'Press on a 30-degree incline to target upper chest development.',
        startingPosition: 'Lying on 30-degree incline bench with dumbbells at shoulder level, elbows 45 degrees to torso.',
        executionTechnique: 'Press dumbbells up and inward in a gentle arch until arms are extended, lower under 3-second control.',
        breathingInstructions: 'Exhale pushing dumbbells up; inhale lowering them to chest level.',
        instructions: [
          'Set bench to 30 degrees.',
          'Kick dumbbells up to starting position.',
          'Press up over upper chest.',
          'Lower with deep stretch.'
        ],
        commonMistakes: ['Setting incline too steep (>45 degrees)', 'Flaring elbows outward'],
        safetyTips: ['Retract shoulder blades into bench'],
        recommendedSets: 4,
        recommendedReps: '8-12',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['chest', 'upper chest', 'incline', 'press'],
        alternatives: ['Incline Barbell Bench Press', 'Incline Hammer Strength Press']
      }
    ]
  },
  {
    name: 'Preacher Curl Machine',
    aliases: ['Scott Curl Machine', 'Bicep Preacher Bench', 'Preacher Curl', 'Arm Curl Machine'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Strict bicep isolation station featuring an angled arm pad that prevents shoulder cheating and momentum.',
    primaryMuscles: ['Biceps (Brachii, Brachialis)'],
    secondaryMuscles: ['Forearms'],
    setupInstructions: [
      'Adjust seat height so armpit rests snug against the top of the angled arm pad.',
      'Place triceps flat on the padding.',
      'Grasp the handles with palms facing upward.'
    ],
    instructions: [
      'Sit tall with chest against the support.',
      'Curl the handles upward toward your shoulders by flexing biceps.',
      'Squeeze biceps firmly at the top.',
      'Lower handles under strict control without slamming the weight.'
    ],
    safetyInstructions: [
      'Do not hyperextend or snap elbows aggressively at the bottom position.',
      'Keep triceps glued to the pad throughout the full rep.'
    ],
    commonMistakes: ['Lifting elbows off the pad', 'Bouncing out of bottom stretch'],
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Machine Preacher Bicep Curl',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Biceps',
        secondaryMuscles: ['Brachialis', 'Forearms'],
        shortDescription: 'Strict bicep curl with fixed arm support eliminating momentum for maximum bicep peak.',
        startingPosition: 'Seated, arms extended over angled pad holding handles with supinated grip.',
        executionTechnique: 'Curl upward until forearms are near vertical, contract bicep peak, lower with control.',
        breathingInstructions: 'Exhale curling up; inhale as you lower the weight.',
        instructions: [
          'Rest arms on angled pad.',
          'Grip handles supinated.',
          'Curl up to peak contraction.',
          'Lower smoothly to soft lockout.'
        ],
        commonMistakes: ['Hyperextending elbows at bottom', 'Leaning back off pad'],
        safetyTips: ['Do not fully disengage elbow joint at bottom'],
        recommendedSets: 3,
        recommendedReps: '10-12',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&auto=format&fit=crop&q=80',
        tags: ['arms', 'biceps', 'curls', 'guns'],
        alternatives: ['Incline Dumbbell Curl', 'Barbell Bicep Curl', 'Hammer Curl']
      }
    ]
  },
  {
    name: 'Assisted Pull-Up/Dip Machine',
    aliases: ['Assisted Chin-Up Machine', 'Gravitron', 'Assisted Dip Machine', 'Counterbalance Pull-Up'],
    category: 'Pin-Loaded / Counterbalance',
    description: 'Counterbalanced knee/foot platform that offsets a portion of bodyweight to help build pull-up and dip strength.',
    primaryMuscles: ['Lats (Pull-Ups)', 'Chest & Triceps (Dips)'],
    secondaryMuscles: ['Biceps', 'Shoulders', 'Upper Back'],
    setupInstructions: [
      'Select counterweight pin (NOTE: Higher pin weight provides MORE assistance/easier lift).',
      'Step up onto the foot platforms and place knees onto the padded lever cushion.',
      'Grip wide pull-up handles overhead or parallel dip handles.'
    ],
    instructions: [
      'Allow the counterweight platform to descend smoothly under your bodyweight.',
      'Pull your chest toward the bar (for pull-up) or press downward (for dips).',
      'Lower with full control until arms are extended.',
      'Step carefully off the platform one foot at a time when finished.'
    ],
    safetyInstructions: [
      'Always step off one foot at a time, holding handles securely until platform rises to the top.',
      'Never let the knee pad slam into the top buffer.'
    ],
    commonMistakes: ['Rushing off the platform', 'Using too little assistance before mastering form'],
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Assisted Pull-Up',
        category: 'Strength',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Lats',
        secondaryMuscles: ['Biceps', 'Rhomboids', 'Upper Back'],
        shortDescription: 'Ideal progression for mastering standard bodyweight pull-ups with calibrated assistance.',
        startingPosition: 'Knees on pad, hands gripping wide pull-up bar, arms fully extended overhead.',
        executionTechnique: 'Drive elbows down and back, pull chin above bar, hold 1 second, lower under control.',
        breathingInstructions: 'Exhale while pulling up; inhale on the descent.',
        instructions: [
          'Kneel on pad, grip wide handles.',
          'Pull chest up toward handles.',
          'Hold 1 second squeeze.',
          'Lower smoothly.'
        ],
        commonMistakes: ['Kicking legs', 'Incomplete top range'],
        safetyTips: ['Keep core braced'],
        recommendedSets: 3,
        recommendedReps: '8-10',
        recommendedRestSec: 90,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['back', 'pullup', 'assisted', 'lats'],
        alternatives: ['Lat Pulldown Machine', 'Bodyweight Pull-Up']
      }
    ]
  },
  {
    name: 'Hip Abduction Machine',
    aliases: ['Outer Thigh Machine', 'Seated Abductor', 'Abduction Machine'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Seated isolation machine training the gluteus medius and minimus by pushing thighs outward against resistance.',
    primaryMuscles: ['Glutes (Gluteus Medius, Gluteus Minimus)'],
    secondaryMuscles: ['Tensor Fasciae Latae (TFL)'],
    setupInstructions: [
      'Sit back with lower back pressed against pad.',
      'Adjust thigh pads to rest on the outside of your knees.',
      'Pull lever to bring legs close together for starting position.'
    ],
    instructions: [
      'Grasp side handles firmly.',
      'Push knees smoothly outward as wide as comfortable.',
      'Hold the peak outer contraction for 1-2 seconds.',
      'Slowly allow legs to return inward without weight stack touching.'
    ],
    safetyInstructions: [
      'Do not jerk the weight open explosively.',
      'Keep hips glued to the seat; do not slide forward.'
    ],
    commonMistakes: ['Using momentum to bounce weights', 'Slumping forward in seat'],
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Seated Hip Abduction',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Glutes (Medius & Minimus)',
        secondaryMuscles: ['Outer Thighs'],
        shortDescription: 'Isolates upper and side glutes, vital for hip stability and pelvic alignment.',
        startingPosition: 'Seated with back firmly against pad, knees against outer pads.',
        executionTechnique: 'Drive knees outward as wide as possible, pause for 2 seconds, return under control.',
        breathingInstructions: 'Exhale pressing outward; inhale returning to center.',
        instructions: [
          'Sit firmly, grip side handles.',
          'Push legs outward wide.',
          'Hold 2 second squeeze.',
          'Control back inward.'
        ],
        commonMistakes: ['Rushing reps', 'Lifting rear off seat'],
        safetyTips: ['Keep feet flat on rests'],
        recommendedSets: 3,
        recommendedReps: '15-20',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
        tags: ['glutes', 'hips', 'abduction', 'legs'],
        alternatives: ['Cable Hip Abduction', 'Banded Lateral Walks']
      }
    ]
  },
  {
    name: 'Hip Adduction Machine',
    aliases: ['Inner Thigh Machine', 'Seated Adductor', 'Adduction Machine'],
    category: 'Pin-Loaded / Selectorized',
    description: 'Seated machine targeting the groin and inner thigh muscles (adductors) by squeezing knees together inward.',
    primaryMuscles: ['Adductors (Inner Thighs, Groin)'],
    secondaryMuscles: ['Gracilis'],
    setupInstructions: [
      'Sit comfortably and adjust thigh pads so they rest on the inside of your knees.',
      'Use adjustment lever to open legs to a comfortable stretch angle.',
      'Grip side handles for stability.'
    ],
    instructions: [
      'Sit tall with chest upright.',
      'Squeeze knees smoothly inward until the pads touch or come close.',
      'Squeeze inner thighs tightly for 1-2 seconds.',
      'Slowly open legs back outward to the initial stretch width.'
    ],
    safetyInstructions: [
      'Do not set the starting width wider than your comfortable groin mobility.',
      'Control the eccentric opening phase carefully to avoid groin strain.'
    ],
    commonMistakes: ['Over-stretching beyond flexibility', 'Bouncing pads together'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Seated Hip Adduction',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Adductors (Inner Thigh)',
        secondaryMuscles: ['Groin'],
        shortDescription: 'Builds inner thigh strength and supports athletic knee stability.',
        startingPosition: 'Seated, legs spread wide with inner knees against pads.',
        executionTechnique: 'Squeeze inner thighs together until pads touch, pause 1 second, slowly open.',
        breathingInstructions: 'Exhale squeezing inward; inhale returning to start.',
        instructions: [
          'Sit tall, grip handles.',
          'Squeeze legs inward together.',
          'Hold 1 second.',
          'Release slowly.'
        ],
        commonMistakes: ['Jerking weight', 'Excessive range of motion'],
        safetyTips: ['Do not bounce weights at full stretch'],
        recommendedSets: 3,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
        tags: ['inner thigh', 'adductors', 'legs', 'groin'],
        alternatives: ['Copenhagen Plank', 'Sumo Squat']
      }
    ]
  },
  {
    name: 'Calf Raise Machine',
    aliases: ['Standing Calf Raise', 'Seated Calf Raise', 'Calf Machine', 'Donkey Calf Machine'],
    category: 'Pin-Loaded / Plate-Loaded',
    description: 'Dedicated lower-leg machine designed to isolate and build the gastrocnemius and soleus muscles.',
    primaryMuscles: ['Calves (Gastrocnemius, Soleus)'],
    secondaryMuscles: ['Tibialis Posterior'],
    setupInstructions: [
      'Adjust shoulder pads (for standing) or knee pads (for seated) to fit height snugly.',
      'Place balls of feet securely on the foot block with heels hanging off the back.',
      'Disengage safety latch if present.'
    ],
    instructions: [
      'Lower heels slowly as deep as possible below the step for a full calf stretch.',
      'Pause at bottom stretch for 1 second.',
      'Press through the balls of your feet and big toes to raise heels as high as possible.',
      'Squeeze calves tightly at the peak for 2 seconds.',
      'Lower slowly under 3-second control.'
    ],
    safetyInstructions: [
      'Do not bounce rapidly at the bottom stretch, as this stresses the Achilles tendon.',
      'Ensure the balls of feet are firmly placed to prevent slipping off the footplate.'
    ],
    commonMistakes: ['Bouncing fast without pauses', 'Short range of motion'],
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Standing Calf Raise',
        category: 'Hypertrophy',
        difficultyLevel: 'Beginner',
        primaryMuscle: 'Calves (Gastrocnemius)',
        secondaryMuscles: ['Soleus'],
        shortDescription: 'Straight-leg calf exercise specifically targeting the larger gastrocnemius muscle.',
        startingPosition: 'Shoulders under pads, balls of feet on block, knees straight but not locked.',
        executionTechnique: 'Deep stretch at bottom, explosive rise onto toes, hold 2-second peak contraction.',
        breathingInstructions: 'Exhale pressing up onto toes; inhale descending into stretch.',
        instructions: [
          'Place balls of feet on step.',
          'Drop heels for deep stretch (2 sec).',
          'Press high onto toes.',
          'Hold peak 2 seconds.'
        ],
        commonMistakes: ['Bouncing Achilles', 'Bending knees'],
        safetyTips: ['Do not rush the eccentric drop'],
        recommendedSets: 4,
        recommendedReps: '12-15',
        recommendedRestSec: 60,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        tags: ['calves', 'legs', 'calfraises', 'standing'],
        alternatives: ['Seated Calf Raise', 'Leg Press Calf Raise', 'Single-Leg Dumbbell Calf Raise']
      }
    ]
  },
  {
    name: 'Hack Squat Machine',
    aliases: ['Hack Squat', 'Incline Squat Machine', 'Reverse Hack Squat'],
    category: 'Plate-Loaded',
    description: 'Fixed angled sled machine supporting the torso while placing intense direct load onto the quadriceps.',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    setupInstructions: [
      'Load Olympic weight plates on sled horns.',
      'Step onto the angled platform with back and shoulders firmly against cushions.',
      'Place feet shoulder-width apart in middle of platform.',
      'Push up slightly and rotate safety disengage lever.'
    ],
    instructions: [
      'Keep back flat against the pad and shoulders under padded blocks.',
      'Descend slowly by bending knees until thighs reach 90 degrees or parallel with footplate.',
      'Drive powerfully through heels and midfoot back upward.',
      'Stop just shy of full knee lockout to maintain quad tension.',
      'Re-engage safety handles at end of set.'
    ],
    safetyInstructions: [
      'Do not allow heels to lift off the platform during the descent.',
      'Do not lock knees aggressively at the top.'
    ],
    commonMistakes: ['Placing feet too low causing excessive knee shear', 'Lifting lower back off pad'],
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    exercises: [
      {
        name: 'Incline Hack Squat',
        category: 'Strength',
        difficultyLevel: 'Intermediate',
        primaryMuscle: 'Quadriceps',
        secondaryMuscles: ['Glutes'],
        shortDescription: 'One of the best pure quad hypertrophy movements, stabilizing the upper body while driving deep knee flexion.',
        startingPosition: 'Back against angled pad, shoulders under cushions, feet shoulder width.',
        executionTechnique: 'Descend under control until thighs hit parallel, drive up through midfoot without knee snapping.',
        breathingInstructions: 'Inhale deep into belly on descent; exhale pressing upward.',
        instructions: [
          'Position back against pad.',
          'Release safety handles.',
          'Squat to 90 degrees.',
          'Drive up through feet.'
        ],
        commonMistakes: ['Bouncing at bottom', 'Snapping knees at top'],
        safetyTips: ['Keep lower back pressed against pad at all times'],
        recommendedSets: 4,
        recommendedReps: '8-12',
        recommendedRestSec: 120,
        videoUrl: 'https://lorem.video/720p.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=80',
        tags: ['legs', 'quads', 'hacksquat', 'strength'],
        alternatives: ['Leg Press', 'Front Squat', 'Goblet Squat']
      }
    ]
  }
];

async function seed() {
  console.log('🌱 Seeding Equipment and Exercise database...');

  for (const item of equipmentData) {
    const { exercises, ...equipmentFields } = item;

    // Upsert equipment by name
    const equipment = await prisma.equipment.upsert({
      where: { name: equipmentFields.name },
      update: {
        aliases: equipmentFields.aliases,
        category: equipmentFields.category,
        description: equipmentFields.description,
        primaryMuscles: equipmentFields.primaryMuscles,
        secondaryMuscles: equipmentFields.secondaryMuscles,
        instructions: equipmentFields.instructions,
        setupInstructions: equipmentFields.setupInstructions,
        safetyInstructions: equipmentFields.safetyInstructions,
        commonMistakes: equipmentFields.commonMistakes,
        imageUrl: equipmentFields.imageUrl,
        isActive: true,
      },
      create: {
        ...equipmentFields,
        isActive: true,
      },
    });

    console.log(`✓ Equipment: ${equipment.name}`);

    // Upsert linked exercises
    for (const ex of exercises) {
      await prisma.exercise.upsert({
        where: { name: ex.name },
        update: {
          equipmentId: equipment.id,
          category: ex.category,
          difficultyLevel: ex.difficultyLevel,
          primaryMuscle: ex.primaryMuscle,
          secondaryMuscles: ex.secondaryMuscles,
          shortDescription: ex.shortDescription,
          instructions: ex.instructions,
          startingPosition: ex.startingPosition,
          executionTechnique: ex.executionTechnique,
          breathingInstructions: ex.breathingInstructions,
          commonMistakes: ex.commonMistakes,
          safetyTips: ex.safetyTips,
          recommendedSets: ex.recommendedSets,
          recommendedReps: ex.recommendedReps,
          recommendedRestSec: ex.recommendedRestSec,
          videoUrl: ex.videoUrl,
          thumbnailUrl: ex.thumbnailUrl,
          tags: ex.tags,
          alternatives: ex.alternatives,
          isActive: true,
        },
        create: {
          ...ex,
          equipmentId: equipment.id,
          isActive: true,
        },
      });
      console.log(`  └─ Exercise: ${ex.name}`);
    }
  }

  console.log('\n✅ All 20 gym equipment machines and linked exercise demonstrations seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
