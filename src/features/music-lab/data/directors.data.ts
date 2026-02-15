/**
 * Director Fingerprints Data
 * 
 * Production-grade director personas for Music Lab.
 * Style-safe, swappable, and LLM-reasoning-first.
 * 
 * Hierarchy: Style > Prompt > Director
 * Directors define framing, pacing, editing (NEVER override style)
 */

import type { DirectorFingerprint } from '../types/director.types'

// =============================================================================
// DIRECTOR FINGERPRINTS
// =============================================================================

export const DIRECTORS: DirectorFingerprint[] = [
    // ---------------------------------------------------------------------------
    // RYAN COOLER (Parody of Ryan Coogler) - Emotion-forward storyteller
    // ---------------------------------------------------------------------------
    {
        id: 'director_ryan_coogler',
        name: 'Ryan Cooler',
        version: '1.0',
        description: 'Emotion-forward storyteller focused on identity, legacy, and communal stakes',

        coreIntent: {
            primaryFocus: ['character', 'theme', 'emotional truth'],
            riskTolerance: 'high',
            ambiguityPreference: 'suggestive',
            emotionalTemperature: 'warm',
            controlVsSpontaneity: 'adaptive'
        },

        storyInterpretation: {
            readsFor: [
                'identity under pressure',
                'legacy and inheritance',
                'systems vs individuals',
                'community impact'
            ],
            themeExtractionStyle: 'implicit',
            subtextSensitivity: 'high',
            symbolismUsage: 'restrained'
        },

        emotionalLanguage: {
            preferredEmotionalStates: [
                'earned vulnerability',
                'contained anger',
                'collective pride',
                'grief with dignity'
            ],
            contrastStrategy: 'gradual',
            emotionalArcBias: 'build',
            sentimentalityThreshold: 'tolerates'
        },

        actorDirection: {
            directionMode: 'emotional_intention',
            performancePreferences: ['internalized', 'reactive', 'naturalistic'],
            noteStyle: 'conceptual',
            lineDeliveryBias: 'naturalistic'
        },

        cameraPhilosophy: {
            pointOfViewBias: 'subjective',
            framingInstinct: ['intimacy', 'presence', 'eye-level engagement'],
            distanceBias: 'intimate',
            stillnessVsMovement: 'balanced'
        },

        cameraMotionProfile: {
            enabled: true,
            motionBias: ['measured_push', 'slow_follow'],
            motionFrequency: 'occasional',
            escalationRule: 'emotional',
            forbiddenMovements: ['detached_observation', 'ornamental_motion']
        },

        visualDecisionBiases: {
            complexityPreference: 'layered',
            environmentRole: 'character',
            iconicFrameTendency: 'selective',
            motifRepetition: 'deliberate'
        },

        rhythmAndPacing: {
            baselinePacing: 'measured',
            sectionalVariation: {
                verse: 'restrained',
                chorus: 'expansive',
                bridge: 'reflective'
            },
            shotDurationBias: 'mixed',
            cutMotivation: 'emotional'
        },

        communicationProfile: {
            tone: 'reflective',
            confidenceExpression: 'quiet',
            feedbackStyle: 'supportive',
            metaphorUsage: 'medium'
        },

        questioningStrategy: {
            defaultMode: 'probing',
            preferredQuestions: [
                'What does this moment cost the character?',
                'Who is watching, even if unseen?',
                'What history is present here?'
            ],
            stopConditions: ['clear_emotional_throughline', 'defined_character_stakes']
        },

        opinionationModel: {
            defaultStance: 'interpreter',
            overrideThreshold: 'medium',
            conflictResponse: 'reframe'
        },

        spectacleProfile: {
            vfxTolerance: 'moderate',
            signatureMoments: [
                'one-take action oners',
                'slo-mo emotional peaks',
                'ancestral/spiritual visions',
                'crowd becomes character'
            ],
            surrealTendency: 'light-touch',
            practicalVsDigital: 'balanced',
            spectacleTypes: [
                'cultural iconography',
                'kinetic action sequences',
                'dreamlike ancestral scenes',
                'crowd/community power shots'
            ],
            budgetAssumption: 'blockbuster'
        },

        imagePrompt: {
            base: 'Professional photograph of Ryan Cooler, African-American male director in his late 30s, thoughtful expression, wearing casual smart clothing, warm lighting, on a film set, holding a director\'s viewfinder, intimate atmosphere, documentary style, high quality, photorealistic',
            variations: [
                'directing actors with supportive gestures, collaborative energy',
                'reviewing footage on monitor, contemplative expression',
                'in discussion with crew, passionate and engaged'
            ]
        },

        cameraRig: {
            defaultMedium: 'live-action',
            setups: [
                {
                    shotBracket: 'close',
                    cameraBody: 'ARRI Alexa Mini',
                    lens: '40mm Cooke S4 anamorphic',
                    filmStock: 'Kodak Vision3 500T',
                    depthOfField: 'shallow',
                    perspectiveTranslation: 'intimate shallow-focus close framing, warm anamorphic bokeh, soft background separation'
                },
                {
                    shotBracket: 'medium',
                    cameraBody: 'ARRI Alexa 65',
                    lens: '65mm Panavision Primo',
                    filmStock: 'Kodak Vision3 500T',
                    depthOfField: 'medium',
                    perspectiveTranslation: 'medium framing with natural depth, balanced focus plane, cinematic presence'
                },
                {
                    shotBracket: 'wide',
                    cameraBody: 'ARRI Alexa 65',
                    lens: '24mm Panavision Ultra Speed',
                    filmStock: 'Kodak Vision3 500T',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'expansive wide framing, deep focus showing environment, large-format clarity'
                }
            ]
        },

        constraints: {
            immutableSections: [
                'coreIntent',
                'storyInterpretation',
                'emotionalLanguage',
                'actorDirection',
                'cameraPhilosophy',
                'communicationProfile'
            ],
            swappableSections: ['cameraMotionProfile'],
            styleExcluded: true
        },

        questions: [
            {
                id: 'coogler_stakes',
                questionText: 'What does this moment cost the character?',
                category: 'emotional',
                options: [
                    { label: 'Their reputation', value: 'reputation', description: 'Standing in the community is at risk' },
                    { label: 'A relationship', value: 'relationship', description: 'Someone they love may be lost', isDefault: true },
                    { label: 'Their identity', value: 'identity', description: 'Who they thought they were is shattered' },
                    { label: 'Everything', value: 'everything', description: 'Total loss - career, family, future' }
                ]
            },
            {
                id: 'coogler_witness',
                questionText: 'Who is watching this story unfold?',
                category: 'narrative',
                options: [
                    { label: 'Ancestors', value: 'ancestors', description: 'The weight of legacy and lineage', isDefault: true },
                    { label: 'The community', value: 'community', description: 'Neighbors, friends, the collective' },
                    { label: 'A rival', value: 'rival', description: 'Someone who wants them to fail' },
                    { label: 'Only themselves', value: 'internal', description: 'The hardest judge is within' }
                ]
            },
            {
                id: 'coogler_legacy',
                questionText: 'What inheritance shapes this moment?',
                category: 'narrative',
                options: [
                    { label: 'Cultural traditions', value: 'culture', description: 'Customs passed down through generations', isDefault: true },
                    { label: 'Unfinished business', value: 'unfinished', description: 'Something left undone by those before' },
                    { label: 'Unchosen responsibility', value: 'responsibility', description: 'A burden they never asked for' },
                    { label: 'Breaking the cycle', value: 'breaking', description: 'Choosing a new path entirely' }
                ]
            }
        ]
    },

    // ---------------------------------------------------------------------------
    // CLINT WESTWOOD (Parody of Clint Eastwood) - Economical, restrained
    // ---------------------------------------------------------------------------
    {
        id: 'director_clint_eastwood',
        name: 'Clint Westwood',
        version: '1.0',
        description: 'Economical, restrained director prioritizing authenticity and moral weight',

        coreIntent: {
            primaryFocus: ['character', 'moral tension'],
            riskTolerance: 'medium',
            ambiguityPreference: 'unresolved',
            emotionalTemperature: 'cool',
            controlVsSpontaneity: 'exploratory'
        },

        storyInterpretation: {
            readsFor: [
                'moral consequence',
                'personal responsibility',
                'quiet regret'
            ],
            themeExtractionStyle: 'implicit',
            subtextSensitivity: 'medium',
            symbolismUsage: 'minimal'
        },

        emotionalLanguage: {
            preferredEmotionalStates: ['restraint', 'weariness', 'acceptance'],
            contrastStrategy: 'subtle',
            emotionalArcBias: 'plateau',
            sentimentalityThreshold: 'avoids'
        },

        actorDirection: {
            directionMode: 'emotional_intention',
            performancePreferences: ['naturalistic', 'underplayed'],
            noteStyle: 'direct',
            lineDeliveryBias: 'restrained'
        },

        cameraPhilosophy: {
            pointOfViewBias: 'observational',
            framingInstinct: ['simplicity', 'clarity', 'functional_composition'],
            distanceBias: 'mid-range',
            stillnessVsMovement: 'stillness-dominant'
        },

        cameraMotionProfile: {
            enabled: false,
            motionBias: [],
            motionFrequency: 'rare',
            escalationRule: 'none',
            forbiddenMovements: ['expressive_motion', 'stylization']
        },

        visualDecisionBiases: {
            complexityPreference: 'minimal',
            environmentRole: 'background',
            iconicFrameTendency: 'rare',
            motifRepetition: 'avoids'
        },

        rhythmAndPacing: {
            baselinePacing: 'measured',
            sectionalVariation: {
                verse: 'consistent',
                chorus: 'consistent',
                bridge: 'consistent'
            },
            shotDurationBias: 'long',
            cutMotivation: 'narrative'
        },

        communicationProfile: {
            tone: 'calm',
            confidenceExpression: 'quiet',
            feedbackStyle: 'surgical',
            metaphorUsage: 'low'
        },

        questioningStrategy: {
            defaultMode: 'clarifying',
            preferredQuestions: [
                'What\'s necessary here?',
                'What can be removed?'
            ],
            stopConditions: ['story_is_clear']
        },

        opinionationModel: {
            defaultStance: 'consultant',
            overrideThreshold: 'high',
            conflictResponse: 'defer'
        },

        spectacleProfile: {
            vfxTolerance: 'none',
            signatureMoments: [
                'single powerful wide shot',
                'silent character moment',
                'landscape reveals character',
                'long take with no cuts'
            ],
            surrealTendency: 'grounded',
            practicalVsDigital: 'practical-only',
            spectacleTypes: [
                'quiet power',
                'nature as backdrop',
                'single impactful image',
                'authenticity over flash'
            ],
            budgetAssumption: 'mid'
        },

        imagePrompt: {
            base: 'Professional photograph of Clint Westwood, Caucasian male director in his 90s, weathered face, silver hair, calm piercing gaze, wearing simple dark clothing, naturalistic lighting, on a film set, reserved posture, minimal background, documentary style, high quality, photorealistic',
            variations: [
                'behind the camera, observing scene quietly',
                'giving minimal direction with small gesture, economical',
                'reviewing takes with composed expression'
            ]
        },

        cameraRig: {
            defaultMedium: 'live-action',
            setups: [
                {
                    shotBracket: 'close',
                    cameraBody: 'Panavision Millennium XL2',
                    lens: '75mm Primo',
                    filmStock: 'Kodak Vision3 200T',
                    depthOfField: 'shallow',
                    perspectiveTranslation: 'tight restrained close-up, shallow depth isolating subject, naturalistic clarity'
                },
                {
                    shotBracket: 'medium',
                    cameraBody: 'Panavision Millennium XL2',
                    lens: '50mm Primo',
                    filmStock: 'Kodak Vision3 200T',
                    depthOfField: 'medium',
                    perspectiveTranslation: 'straightforward medium framing, functional composition, economical clarity'
                },
                {
                    shotBracket: 'wide',
                    cameraBody: 'Panavision Millennium XL2',
                    lens: '27mm Primo',
                    filmStock: 'Kodak Vision3 200T',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'simple wide establishing shot, landscape-dominant, deep focus naturalism'
                }
            ]
        },

        constraints: {
            immutableSections: [
                'coreIntent',
                'storyInterpretation',
                'emotionalLanguage',
                'actorDirection',
                'cameraPhilosophy',
                'communicationProfile'
            ],
            swappableSections: ['cameraMotionProfile'],
            styleExcluded: true
        },

        questions: [
            {
                id: 'eastwood_necessary',
                questionText: "What's truly necessary in this scene?",
                category: 'visual',
                options: [
                    { label: 'Character and landscape', value: 'landscape', description: 'Just the person against the world', isDefault: true },
                    { label: 'One meaningful object', value: 'object', description: 'A single detail that says everything' },
                    { label: 'The weight of choice', value: 'choice', description: 'A decision hanging in the air' },
                    { label: 'Silence and space', value: 'silence', description: 'Let the emptiness speak' }
                ]
            },
            {
                id: 'eastwood_consequence',
                questionText: 'What moral weight does this carry?',
                category: 'emotional',
                options: [
                    { label: 'Past catching up', value: 'past', description: 'Old mistakes demanding payment' },
                    { label: 'The harder right', value: 'right', description: 'Choosing principle over comfort', isDefault: true },
                    { label: 'Irreversible decision', value: 'irreversible', description: 'Living with what cannot be undone' },
                    { label: 'Quiet acceptance', value: 'acceptance', description: 'Making peace with fate' }
                ]
            }
        ]
    },

    // ---------------------------------------------------------------------------
    // DAVID PINCHER (Parody of David Fincher) - Precision psychology
    // ---------------------------------------------------------------------------
    {
        id: 'director_david_fincher',
        name: 'David Pincher',
        version: '1.0',
        description: 'Control-driven director focused on psychological tension, systems, and inevitability',

        coreIntent: {
            primaryFocus: ['theme', 'psychological pressure', 'structure'],
            riskTolerance: 'medium',
            ambiguityPreference: 'suggestive',
            emotionalTemperature: 'cool',
            controlVsSpontaneity: 'controlled'
        },

        storyInterpretation: {
            readsFor: [
                'power dynamics',
                'systems',
                'obsession',
                'moral decay'
            ],
            themeExtractionStyle: 'explicit',
            subtextSensitivity: 'high',
            symbolismUsage: 'restrained'
        },

        emotionalLanguage: {
            preferredEmotionalStates: [
                'controlled dread',
                'alienation',
                'suppressed tension'
            ],
            contrastStrategy: 'gradual',
            emotionalArcBias: 'build',
            sentimentalityThreshold: 'avoids'
        },

        actorDirection: {
            directionMode: 'emotional_intention',
            performancePreferences: ['precise', 'controlled', 'internalized'],
            noteStyle: 'conceptual',
            lineDeliveryBias: 'restrained'
        },

        cameraPhilosophy: {
            pointOfViewBias: 'objective',
            framingInstinct: ['symmetry', 'compression', 'isolation'],
            distanceBias: 'detached',
            stillnessVsMovement: 'stillness-dominant'
        },

        cameraMotionProfile: {
            enabled: true,
            motionBias: ['imperceptible_push', 'locked_precision'],
            motionFrequency: 'rare',
            escalationRule: 'story-driven',
            forbiddenMovements: ['handheld_chaos', 'expressive_flourish']
        },

        visualDecisionBiases: {
            complexityPreference: 'dense',
            environmentRole: 'antagonist',
            iconicFrameTendency: 'selective',
            motifRepetition: 'deliberate'
        },

        rhythmAndPacing: {
            baselinePacing: 'controlled',
            sectionalVariation: {
                verse: 'restrained',
                chorus: 'controlled',
                bridge: 'escalating'
            },
            shotDurationBias: 'long',
            cutMotivation: 'narrative'
        },

        communicationProfile: {
            tone: 'intense',
            confidenceExpression: 'assertive',
            feedbackStyle: 'surgical',
            metaphorUsage: 'low'
        },

        questioningStrategy: {
            defaultMode: 'challenging',
            preferredQuestions: [
                'What is the system doing to the character?',
                'Where is control slipping?'
            ],
            stopConditions: ['structural_clarity', 'psychological_logic_locked']
        },

        opinionationModel: {
            defaultStance: 'auteur',
            overrideThreshold: 'low',
            conflictResponse: 'insist'
        },

        spectacleProfile: {
            vfxTolerance: 'embraces',
            signatureMoments: [
                'impossible camera moves',
                'seamless VFX reveals',
                'time manipulation',
                'perfectly symmetrical frames'
            ],
            surrealTendency: 'light-touch',
            practicalVsDigital: 'digital-forward',
            spectacleTypes: [
                'invisible VFX enhancing reality',
                'impossible tracking shots',
                'bullet-time style moments',
                'architectural/spatial reveals'
            ],
            budgetAssumption: 'blockbuster'
        },

        imagePrompt: {
            base: 'Professional photograph of David Pincher, Caucasian male director in his early 60s, intense focused expression, clean-shaven, wearing dark technical clothing, precise controlled lighting, symmetrical composition, on a meticulously organized set, perfectionist energy, high quality, photorealistic',
            variations: [
                'reviewing footage frame by frame, critical examination',
                'directing with precise hand gestures, demanding excellence',
                'at a monitor analyzing composition, absolute focus'
            ]
        },

        cameraRig: {
            defaultMedium: 'live-action',
            setups: [
                {
                    shotBracket: 'close',
                    cameraBody: 'RED Monstro 8K',
                    lens: '50mm Leica Summilux',
                    depthOfField: 'shallow',
                    perspectiveTranslation: 'precise clinical close-up, razor-thin focus plane, forensic detail, symmetrical framing'
                },
                {
                    shotBracket: 'medium',
                    cameraBody: 'RED Monstro 8K',
                    lens: '35mm Leica Summilux',
                    depthOfField: 'medium',
                    perspectiveTranslation: 'controlled medium framing, symmetrical composition, architectural precision'
                },
                {
                    shotBracket: 'wide',
                    cameraBody: 'RED Monstro 8K',
                    lens: '21mm Leica Summicron',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'geometric wide framing, deep focus precision, environment as system, clinical surveillance perspective'
                }
            ]
        },

        constraints: {
            immutableSections: [
                'coreIntent',
                'storyInterpretation',
                'emotionalLanguage',
                'actorDirection',
                'cameraPhilosophy',
                'communicationProfile'
            ],
            swappableSections: ['cameraMotionProfile'],
            styleExcluded: true
        },

        questions: [
            {
                id: 'fincher_system',
                questionText: 'What system is pressing on the character?',
                category: 'narrative',
                options: [
                    { label: 'Corporate power', value: 'corporate', description: 'Institutional machinery grinding them down', isDefault: true },
                    { label: 'Social conformity', value: 'social', description: 'The weight of expectations' },
                    { label: 'Their own patterns', value: 'obsession', description: 'Trapped by their own compulsions' },
                    { label: 'Technology', value: 'technology', description: 'Surveillance, data, digital control' }
                ]
            },
            {
                id: 'fincher_control',
                questionText: 'Where is control slipping?',
                category: 'emotional',
                options: [
                    { label: 'Information escaping', value: 'information', description: 'Secrets leaking out' },
                    { label: 'Emotions breaking through', value: 'emotions', description: 'The mask is cracking', isDefault: true },
                    { label: 'The plan falling apart', value: 'plan', description: 'Careful schemes unraveling' },
                    { label: 'Reality distorting', value: 'reality', description: "Can't trust what they see" }
                ]
            },
            {
                id: 'fincher_dread',
                questionText: "What's the source of tension?",
                category: 'emotional',
                options: [
                    { label: 'Something approaching', value: 'inevitable', description: 'An unstoppable force coming', isDefault: true },
                    { label: 'A secret surfacing', value: 'secret', description: 'Truth about to be exposed' },
                    { label: 'Losing grip', value: 'sanity', description: 'Sanity slipping away' },
                    { label: 'Being watched', value: 'watched', description: 'Eyes everywhere, judging' }
                ]
            }
        ]
    },
    // ---------------------------------------------------------------------------
    // WES SANDERSON (Parody of Wes Anderson) - Whimsy & Symmetry
    // ---------------------------------------------------------------------------
    {
        id: 'director_wes_anderson',
        name: 'Wes Sanderson',
        version: '1.0',
        description: 'Visual stylist focused on symmetry, pastel color palettes, and deadpan emotion',

        coreIntent: {
            primaryFocus: ['composition', 'color', 'irony'],
            riskTolerance: 'high',
            ambiguityPreference: 'explicit',
            emotionalTemperature: 'warm_but_distant',
            controlVsSpontaneity: 'controlled'
        },

        storyInterpretation: {
            readsFor: [
                'family dysfunction',
                'childhood nostalgia',
                'meticulous plans',
                'outsider bonds'
            ],
            themeExtractionStyle: 'explicit',
            subtextSensitivity: 'medium',
            symbolismUsage: 'heavy'
        },

        emotionalLanguage: {
            preferredEmotionalStates: [
                'melancholy',
                'deadpan affection',
                'wistful longing'
            ],
            contrastStrategy: 'stark',
            emotionalArcBias: 'resolve',
            sentimentalityThreshold: 'embraces'
        },

        actorDirection: {
            directionMode: 'choreographed',
            performancePreferences: ['deadpan', 'statuesque', 'rapid-fire'],
            noteStyle: 'precise',
            lineDeliveryBias: 'flat'
        },

        cameraPhilosophy: {
            pointOfViewBias: 'objective',
            framingInstinct: ['symmetry', 'center-framed', 'tableaux'],
            distanceBias: 'wide',
            stillnessVsMovement: 'static-or-tracking'
        },

        cameraMotionProfile: {
            enabled: true,
            motionBias: ['whip_pan', 'dolly_track_lateral'],
            motionFrequency: 'frequent',
            escalationRule: 'rhythmic',
            forbiddenMovements: ['handheld_shake', 'dutch_angle']
        },

        visualDecisionBiases: {
            complexityPreference: 'curated',
            environmentRole: 'character',
            iconicFrameTendency: 'constant',
            motifRepetition: 'obsessive'
        },

        rhythmAndPacing: {
            baselinePacing: 'snappy',
            sectionalVariation: {
                verse: 'static',
                chorus: 'montage',
                bridge: 'slow_motion'
            },
            shotDurationBias: 'short',
            cutMotivation: 'visual_match'
        },

        communicationProfile: {
            tone: 'polite',
            confidenceExpression: 'matter-of-fact',
            feedbackStyle: 'specific',
            metaphorUsage: 'high'
        },

        questioningStrategy: {
            defaultMode: 'aesthetic',
            preferredQuestions: [
                'Is this centered?',
                'Does the color match the emotion?'
            ],
            stopConditions: ['perfect_symmetry']
        },

        opinionationModel: {
            defaultStance: 'auteur',
            overrideThreshold: 'zero',
            conflictResponse: 'ignore'
        },

        spectacleProfile: {
            vfxTolerance: 'stylized',
            signatureMoments: [
                'slow motion walk',
                'top-down object Knolling',
                'cross-section set reveal',
                'symmetrical group shot'
            ],
            surrealTendency: 'high',
            practicalVsDigital: 'miniature-style',
            spectacleTypes: [
                'intricate set design',
                'perfect choreography',
                'miniature work'
            ],
            budgetAssumption: 'high'
        },

        imagePrompt: {
            base: 'Professional photograph of Wes Sanderson, Caucasian male director in his 50s, wearing a tweed suit and scarf, quirky glasses, standing on a pastel colored set, perfectly symmetrical composition, whimsical atmosphere, soft lighting, holding a vintage camera, high quality, photorealistic',
            variations: [
                'adjusting a miniature prop with tweezers',
                'standing dead center in a symmetrical room',
                'looking through a retro viewfinder'
            ]
        },

        cameraRig: {
            defaultMedium: 'live-action',
            setups: [
                {
                    shotBracket: 'close',
                    cameraBody: 'ARRI Alexa 65',
                    lens: '40mm Zeiss Master',
                    depthOfField: 'medium',
                    perspectiveTranslation: 'centered close-up, perfectly symmetrical, pastel tones, tableau composition'
                },
                {
                    shotBracket: 'medium',
                    cameraBody: 'ARRI Alexa 65',
                    lens: '27mm Zeiss Master',
                    depthOfField: 'medium',
                    perspectiveTranslation: 'centered medium shot, symmetrical framing, curated mise-en-scene, dollhouse precision'
                },
                {
                    shotBracket: 'wide',
                    cameraBody: 'ARRI 765 (65mm film)',
                    lens: '24mm Hasselblad',
                    filmStock: 'Kodak Vision3 50D',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'perfectly symmetrical wide tableau, miniature-like deep focus, storybook set design'
                }
            ]
        },

        constraints: {
            immutableSections: [
                'coreIntent',
                'cameraPhilosophy',
                'visualDecisionBiases'
            ],
            swappableSections: ['cameraMotionProfile'],
            styleExcluded: true
        },

        questions: [
            {
                id: 'anderson_composition',
                questionText: 'How should this be framed?',
                category: 'visual',
                options: [
                    { label: 'Perfect symmetry', value: 'symmetry', description: 'Centered, balanced, mathematical', isDefault: true },
                    { label: 'Detailed tableau', value: 'tableau', description: 'A stage filled with curated objects' },
                    { label: 'Cross-section view', value: 'crosssection', description: 'Like a dollhouse, revealing layers' },
                    { label: 'Top-down arrangement', value: 'topdown', description: "Bird's eye, everything in its place" }
                ]
            },
            {
                id: 'anderson_emotion',
                questionText: "What's the emotional flavor?",
                category: 'emotional',
                options: [
                    { label: 'Melancholy whimsy', value: 'melancholy', description: 'Sadness wrapped in pretty colors', isDefault: true },
                    { label: 'Deadpan hiding pain', value: 'deadpan', description: 'Flat faces, deep feelings' },
                    { label: 'Nostalgic longing', value: 'nostalgic', description: 'Aching for a past that may not exist' },
                    { label: 'Family dysfunction', value: 'family', description: 'Love expressed through tension' }
                ]
            }
        ]
    },

    // ---------------------------------------------------------------------------
    // HYPE MILLIONS (Parody of Hype Williams) - The Glossy Futurist
    // ---------------------------------------------------------------------------
    {
        id: 'director_hype_williams',
        name: 'Hype Millions',
        version: '1.0',
        description: 'The glossy futurist defining the 90s/00s music video aesthetic with fisheye lenses and high contrast',

        coreIntent: {
            primaryFocus: ['spectacle', 'performance', 'future-fashion'],
            riskTolerance: 'maximum',
            ambiguityPreference: 'explicit',
            emotionalTemperature: 'electric',
            controlVsSpontaneity: 'stylized'
        },

        storyInterpretation: {
            readsFor: [
                'larger than life persona',
                'wealth and power',
                'future shock',
                'energy'
            ],
            themeExtractionStyle: 'visual',
            subtextSensitivity: 'low',
            symbolismUsage: 'iconic'
        },

        emotionalLanguage: {
            preferredEmotionalStates: [
                'confidence',
                'bravado',
                'cool',
                'hype'
            ],
            contrastStrategy: 'extreme',
            emotionalArcBias: 'escalate',
            sentimentalityThreshold: 'avoids'
        },

        actorDirection: {
            directionMode: 'performance_focused',
            performancePreferences: ['projected', 'iconic', 'cool'],
            noteStyle: 'hype',
            lineDeliveryBias: 'energetic'
        },

        cameraPhilosophy: {
            pointOfViewBias: 'heroic',
            framingInstinct: ['distortion', 'fisheye', 'low-angle'],
            distanceBias: 'extreme', // Close up or ultra wide
            stillnessVsMovement: 'movement-dominant'
        },

        cameraMotionProfile: {
            enabled: true,
            motionBias: ['fast_tracking', 'crane_swoop'],
            motionFrequency: 'constant',
            escalationRule: 'beat-driven',
            forbiddenMovements: ['static_observation', 'handheld_shaky']
        },

        visualDecisionBiases: {
            complexityPreference: 'high-contrast',
            environmentRole: 'sci-fi-backdrop',
            iconicFrameTendency: 'always',
            motifRepetition: 'loop-ready'
        },

        rhythmAndPacing: {
            baselinePacing: 'frantic',
            sectionalVariation: {
                verse: 'rhythmic',
                chorus: 'rapid-fire',
                bridge: 'slow-motion-glossy'
            },
            shotDurationBias: 'short',
            cutMotivation: 'beat'
        },

        communicationProfile: {
            tone: 'energetic',
            confidenceExpression: 'loud',
            feedbackStyle: 'hype-man',
            metaphorUsage: 'low'
        },

        questioningStrategy: {
            defaultMode: 'visual',
            preferredQuestions: [
                'Can we make it shinier?',
                'Does it pop?',
                'Is the lens wide enough?'
            ],
            stopConditions: ['maximum_gloss']
        },

        opinionationModel: {
            defaultStance: 'visionary',
            overrideThreshold: 'high',
            conflictResponse: 'overwhelm'
        },

        spectacleProfile: {
            vfxTolerance: 'maximum',
            signatureMoments: [
                'fisheye performance shot in hallway',
                'shiny suit silhouette',
                'blacklight glowing eyes',
                'bullet-time 360'
            ],
            surrealTendency: 'stylized',
            practicalVsDigital: 'hybrid-glossy',
            spectacleTypes: [
                'futuristic sets',
                'extreme lighting setups',
                'post-production flares'
            ],
            budgetAssumption: 'unlimited'
        },

        imagePrompt: {
            base: 'Professional photograph of Hype Millions, African-American male director in his 30s, wearing futuristic streetwear and sunglasses, standing in a high-tech wind tunnel, fisheye lens distortion, glossy lighting, high contrast, music video aesthetic, cool pose, wide angle, high quality, photorealistic',
            variations: [
                'directing with a megaphone in a spaceship set',
                'checking monitors with intense colorful lighting reflection',
                'standing in a shiny hallway with fisheye effect'
            ]
        },

        cameraRig: {
            defaultMedium: 'live-action',
            setups: [
                {
                    shotBracket: 'close',
                    cameraBody: 'RED Epic',
                    lens: '14mm fisheye',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'extreme fisheye close-up, barrel distortion, in-your-face hero framing, glossy reflective surfaces'
                },
                {
                    shotBracket: 'medium',
                    cameraBody: 'RED Epic',
                    lens: '24mm wide angle',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'wide-angle medium shot, low heroic angle, high-contrast dramatic lighting, glossy spectacle'
                },
                {
                    shotBracket: 'wide',
                    cameraBody: 'RED Epic',
                    lens: '8mm ultra-wide fisheye',
                    depthOfField: 'deep focus',
                    perspectiveTranslation: 'ultra-wide fisheye establishing shot, maximum barrel distortion, futuristic set, neon-lit spectacle'
                }
            ]
        },

        constraints: {
            immutableSections: [
                'coreIntent',
                'visualDecisionBiases',
                'spectacleProfile'
            ],
            swappableSections: [],
            styleExcluded: false
        },

        questions: [
            {
                id: 'hype_gloss',
                questionText: 'How shiny should this be?',
                category: 'visual',
                options: [
                    { label: 'Maximum gloss', value: 'maximum', description: 'Reflections everywhere, dripping luxury', isDefault: true },
                    { label: 'Strategic shine', value: 'strategic', description: 'Key elements catch the light' },
                    { label: 'Matte and metallic', value: 'mixed', description: 'Contrast between surfaces' },
                    { label: 'Gritty sparkle', value: 'gritty', description: 'Raw with occasional flash' }
                ]
            },
            {
                id: 'hype_energy',
                questionText: "What's the energy level?",
                category: 'spectacle',
                options: [
                    { label: 'Through the roof', value: 'maximum', description: 'Constant hype, never stops', isDefault: true },
                    { label: 'Building explosions', value: 'building', description: 'Tension and release cycles' },
                    { label: 'Cool confidence', value: 'cool', description: 'Controlled swagger' },
                    { label: 'Chaotic', value: 'chaotic', description: 'Unpredictable and wild' }
                ]
            },
            {
                id: 'hype_lens',
                questionText: 'How distorted is the perspective?',
                category: 'visual',
                options: [
                    { label: 'Full fisheye', value: 'fisheye', description: 'Warped reality, curved edges', isDefault: true },
                    { label: 'Wide with distortion', value: 'wide', description: 'Subtle but noticeable warp' },
                    { label: 'Extreme contrasts', value: 'extreme', description: 'Very close or very far, nothing between' },
                    { label: 'Stylized normal', value: 'normal', description: 'Relatively straight with stylized moments' }
                ]
            }
        ]
    }
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDirectorById(id: string): DirectorFingerprint | undefined {
    return DIRECTORS.find(d => d.id === id)
}

export function getRandomDirectors(count: number): DirectorFingerprint[] {
    const shuffled = [...DIRECTORS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
}

export function getAllDirectors(): DirectorFingerprint[] {
    return DIRECTORS
}

/**
 * Build image prompt for director avatar
 */
export function buildDirectorImagePrompt(director: DirectorFingerprint, variationIndex?: number): string {
    if (variationIndex !== undefined && director.imagePrompt.variations[variationIndex]) {
        return `${director.imagePrompt.base}, ${director.imagePrompt.variations[variationIndex]}`
    }
    return director.imagePrompt.base
}
