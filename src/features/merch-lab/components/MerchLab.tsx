'use client'

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { usePrintify, useMerchLabStore } from '../hooks'
import { ProductPicker } from './ProductPicker'
import { ColorPicker } from './ColorPicker'
import { DesignStylePicker } from './DesignStylePicker'
import { DesignPrompt } from './DesignPrompt'
import { MockupPreview } from './MockupPreview'
import { OrderPanel } from './OrderPanel'
import { OrderModal } from './OrderModal'
import { PipelineStepper } from './PipelineStepper'

export function MerchLab() {
  usePrintify()

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

          {/* Center Panel — Mockup Preview */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <MockupPreview />
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
