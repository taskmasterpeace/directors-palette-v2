'use client'

import React, { Suspense, useCallback } from 'react'
import { useShotCreatorSettings } from '../../hooks/useShotCreatorSettings'
import { useShotCreatorStore } from '../../store/shot-creator.store'
import type { CameraAngle } from '../../helpers/camera-angle.helper'
import { DEFAULT_CAMERA_ANGLE } from '../../helpers/camera-angle.helper'
import { Slider } from '@/components/ui/slider'

// Lazy load the 3D gizmo (Three.js is heavy)
const CameraAngleGizmo = React.lazy(() =>
  import('./CameraAngleGizmo').then(m => ({ default: m.CameraAngleGizmo }))
)

/**
 * Camera Angle section shown in Shot Creator settings
 * when the Qwen Image Edit (Camera Angle) model is selected.
 */
export function CameraAngleSection() {
  const { settings, updateSettings } = useShotCreatorSettings()
  const referenceImages = useShotCreatorStore(s => s.shotCreatorReferenceImages)

  const isEnabled = settings.cameraEnabled !== false // Default to enabled for this model
  const loraScale = settings.loraScale ?? 1.25

  // Get first reference image URL to display in the 3D gizmo
  const firstImageUrl = referenceImages[0]?.preview || referenceImages[0]?.url || undefined

  const currentAngle: CameraAngle = {
    azimuth: settings.cameraAzimuth ?? DEFAULT_CAMERA_ANGLE.azimuth,
    elevation: settings.cameraElevation ?? DEFAULT_CAMERA_ANGLE.elevation,
    distance: settings.cameraDistance ?? DEFAULT_CAMERA_ANGLE.distance,
  }

  const handleAngleChange = useCallback((angle: CameraAngle) => {
    updateSettings({
      cameraAzimuth: angle.azimuth,
      cameraElevation: angle.elevation,
      cameraDistance: angle.distance,
      cameraEnabled: true,
    })
  }, [updateSettings])

  const toggleEnabled = useCallback(() => {
    updateSettings({ cameraEnabled: !isEnabled })
  }, [isEnabled, updateSettings])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">
          Camera Angle
        </h3>
        <button
          onClick={toggleEnabled}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            isEnabled
              ? 'bg-cyan-600/30 text-cyan-300'
              : 'bg-white/5 text-white/30'
          }`}
        >
          {isEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {isEnabled && (
        <>
          <Suspense
            fallback={
              <div className="w-full h-[200px] rounded-lg bg-white/5 animate-pulse flex items-center justify-center">
                <span className="text-xs text-white/30">Loading 3D controls...</span>
              </div>
            }
          >
            <CameraAngleGizmo angle={currentAngle} onChange={handleAngleChange} imageUrl={firstImageUrl} />
          </Suspense>

          {/* LoRA Intensity */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Intensity</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-cyan-400 font-medium tabular-nums">{loraScale.toFixed(1)}</span>
                {loraScale !== 1.25 && (
                  <button
                    onClick={() => updateSettings({ loraScale: 1.25 })}
                    className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
            <Slider
              value={[loraScale]}
              onValueChange={([val]) => updateSettings({ loraScale: val })}
              min={0}
              max={4}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-white/20">
              <span>None</span>
              <span>Default</span>
              <span>Extreme</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
