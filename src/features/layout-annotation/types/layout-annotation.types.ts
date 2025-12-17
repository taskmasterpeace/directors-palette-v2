export interface CanvasHistoryItem {
  action: string
  data: unknown
}

export interface CanvasObject {
  id: string
  type: string
  data: unknown
}

export interface CanvasState {
  tool: 'select' | 'brush' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser' | 'crop'
  brushSize: number
  color: string
  opacity: number
  fontSize: number
  fontFamily: string
  fillMode: boolean
  layers: CanvasLayer[]
  history: CanvasHistoryItem[]
  historyIndex: number
  zoom: number
  gridEnabled: boolean
  snapToGrid: boolean
  aspectRatio: string
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
}

export interface CanvasLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  type: 'image' | 'annotation'
  objects: CanvasObject[]
}

export interface DrawingProperties {
  color: string
  brushSize: number
  opacity: number
  fontSize: number
  fontFamily: string
  fillMode?: boolean
  backgroundColor?: string
}