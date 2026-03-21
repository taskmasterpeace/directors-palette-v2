'use client'

import dynamic from 'next/dynamic'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { usePrintify, usePrintifyMockup, useMerchLabStore } from '../hooks'
import { ProductPicker } from './ProductPicker'
import { ColorPicker } from './ColorPicker'
import { DesignStylePicker } from './DesignStylePicker'
import { DesignPrompt } from './DesignPrompt'
import { OrderPanel } from './OrderPanel'
import { OrderModal } from './OrderModal'
import { PipelineStepper } from './PipelineStepper'

const DesignEditor = dynamic(() => import('./DesignEditor').then(m => ({ default: m.DesignEditor })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-xs text-muted-foreground/40">Loading editor...</div>
    </div>
  ),
})

export function MerchLab() {
  usePrintify()
  usePrintifyMockup()

  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const designCount = useMerchLabStore((s) => s.generatedDesigns.length)

  const currentStep = !selectedColor ? 1 : designCount === 0 ? 2 : 3

  return (
    <>
      <div className="flex h-full w-full flex-col">
        <PipelineStepper currentStep={currentStep} />

        <ResizablePanelGroup direction="horizontal" className="flex-1 w-full">
          {/* Left Panel — Design Controls */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full overflow-y-auto border-r border-border/30">
              <ProductPicker />
              <ColorPicker />
              <DesignStylePicker />
              <DesignPrompt />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center Panel — Design Editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <DesignEditor />
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel — Order Details */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
            <OrderPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <OrderModal />
    </>
  )
}
