"use client"

import { SectionHeader } from "@/components/SectionHeader"
import { WizardContainer } from "./wizard/WizardContainer"

export function Storybook() {
  return (
    <div className="h-full flex flex-col">
      <SectionHeader section="storybook" />
      <div className="flex-1 overflow-hidden">
        <WizardContainer />
      </div>
    </div>
  )
}
