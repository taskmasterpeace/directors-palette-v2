/**
 * Storybook Feature Module
 * Children's book creator with AI-generated illustrations
 */

// Components
export { Storybook } from './components/Storybook'

// Store
export { useStorybookStore } from './store/storybook.store'

// Types
export type {
  WizardStep,
  StorybookProject,
  StorybookPage,
  StorybookCharacter,
  StorybookStyle,
  CharacterExpression,
  SceneJSON,
} from './types/storybook.types'

export { WIZARD_STEPS, getStepIndex, getNextStep, getPreviousStep } from './types/storybook.types'

export type { SceneSpec, SceneDescription, SceneCharacterAction } from './types/scene.types'
export { buildPromptFromScene, parseTextToScene } from './types/scene.types'
