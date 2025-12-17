/**
 * Layout Annotation Constants
 */

import { CanvasState } from "../types"

export const INITIAL_CANVAS_STATE: CanvasState = {
    tool: 'select',
    brushSize: 5,
    color: '#00d2d3', // Cyan for annotations
    opacity: 1,
    fontSize: 24,
    fontFamily: 'Arial',
    fillMode: false,
    layers: [
        { id: 'background', name: 'Background', visible: true, locked: false, type: 'image', objects: [] },
        { id: 'annotations', name: 'Annotations', visible: true, locked: false, type: 'annotation', objects: [] }
    ],
    history: [],
    historyIndex: -1,
    zoom: 1,
    gridEnabled: false,
    snapToGrid: false,
    aspectRatio: '16:9',
    canvasWidth: 1200,
    canvasHeight: 675,
    backgroundColor: '#ffffff'
}

export const ASPECT_RATIOS = [
    { id: '16:9', width: 1200, height: 675 },
    { id: '9:16', width: 675, height: 1200 },
    { id: '1:1', width: 900, height: 900 },
    { id: '4:3', width: 1200, height: 900 },
    { id: '21:9', width: 1260, height: 540 },
] as const


export const EXPORT_FORMATS = [
    { value: 'png', label: 'PNG', description: 'Best for images with transparency' },
    { value: 'jpg', label: 'JPEG', description: 'Best for photos, smaller file size' }
]

export const QUALITY_PRESETS = [
    { label: 'Low (Fast)', value: 0.6 },
    { label: 'Medium', value: 0.8 },
    { label: 'High', value: 0.9 },
    { label: 'Maximum', value: 1.0 }
]

export const SCALE_PRESETS = [
    { label: '0.5x (Small)', value: 0.5 },
    { label: '1x (Original)', value: 1 },
    { label: '2x (HD)', value: 2 },
    { label: '4x (Ultra HD)', value: 4 }
]