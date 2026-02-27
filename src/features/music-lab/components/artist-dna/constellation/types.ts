export interface NodeData {
  id: string
  label: string
  category: string
  ring: string
  importance: number
}

export interface RingData {
  label: string
  color: string
  fill: number
  itemCount: number
  glowChars: number
  nodes: NodeData[]
  tabId: string
}

export interface AtmospherePreset {
  palette: [number, number, number][]
  particleSize: number
  brightness: number
}
