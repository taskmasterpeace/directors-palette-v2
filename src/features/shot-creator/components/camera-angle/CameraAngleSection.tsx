'use client'

import React, { Suspense, useCallback } from 'react'
import { useShotCreatorSettings } from '../../hooks/useShotCreatorSettings'
import type { CameraAngle } from '../../helpers/camera-angle.helper'
import { DEFAULT_CAMERA_ANGLE } from '../../helpers/camera-angle.helper'

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

  const isEnabled = settings.cameraEnabled !== false // Default to enabled for this model

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
        <Suspense
          fallback={
            <div className="w-full h-[200px] rounded-lg bg-white/5 animate-pulse flex items-center justify-center">
              <span className="text-xs text-white/30">Loading 3D controls...</span>
            </div>
          }
        >
          <CameraAngleGizmo angle={currentAngle} onChange={handleAngleChange} />
        </Suspense>
      )}
    </div>
  )
}
