'use client'

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { usePrintify } from '../hooks'
import { ProductPicker } from './ProductPicker'
import { ColorPicker } from './ColorPicker'
import { DesignStylePicker } from './DesignStylePicker'
import { DesignPrompt } from './DesignPrompt'
import { MockupPreview } from './MockupPreview'
import { OrderPanel } from './OrderPanel'
import { OrderModal } from './OrderModal'

export function MerchLab() {
  usePrintify()

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
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

      <OrderModal />
    </>
  )
}
