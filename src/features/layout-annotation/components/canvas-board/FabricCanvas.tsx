'use client'

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback
} from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Lock,
  Unlock,
  Crop
} from 'lucide-react'
import * as fabric from 'fabric'
import { clipboardManager } from '@/utils/clipboard-manager'
import { cn } from '@/utils/utils'

type ImageImportMode = 'fit' | 'fill'
type CanvasMode = 'canvas' | 'photo'

interface FabricCanvasProps {
  tool: 'select' | 'brush' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser' | 'crop'
  brushSize: number
  fontSize?: number
  color: string
  fillMode?: boolean
  backgroundColor?: string
  onObjectsChange?: (count: number) => void
  onToolChange?: (tool: 'select' | 'brush' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser' | 'crop') => void
  canvasWidth?: number
  canvasHeight?: number
  imageImportMode?: ImageImportMode
  canvasMode?: CanvasMode
  backgroundImageUrl?: string | null
  onCanvasSizeChange?: (width: number, height: number) => void
  headerContent?: React.ReactNode
  centerContent?: React.ReactNode
}

export interface FabricCanvasRef {
  undo: () => void
  redo: () => void
  clear: () => void
  clearBackground: () => void
  exportCanvas: (format: string) => string
  importImage: (imageUrl: string) => void
  isEmpty: () => boolean
  setCropAspectRatio: (ratio: number | null) => void
  applyCrop: () => Promise<void>
  getDimensions: () => { width: number; height: number }
}

const FabricCanvas = forwardRef<FabricCanvasRef, FabricCanvasProps>((props, ref) => {
  const {
    tool,
    brushSize,
    fontSize = 20,
    color,
    fillMode = false,
    backgroundColor = '#ffffff',
    onObjectsChange,
    onToolChange,
    canvasWidth = 1200,
    canvasHeight = 675,
    imageImportMode = 'fit',
    canvasMode = 'canvas',
    backgroundImageUrl: _backgroundImageUrl = null,

    onCanvasSizeChange,
    headerContent
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const cropRectRef = useRef<fabric.Rect | null>(null)
  const cropTargetRef = useRef<fabric.Image | null>(null)
  const _cropOverlayRef = useRef<fabric.Rect | null>(null)
  const [scale, setScale] = useState(1)
  const [autoScale, setAutoScale] = useState(true)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDrawingShape, setIsDrawingShape] = useState(false)
  const [shapeStartPoint, setShapeStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)

  // Calculate auto-scale to fit canvas in viewport
  const calculateAutoScale = useCallback(() => {
    if (!containerRef.current) return 1

    const container = containerRef.current
    const containerWidth = container.clientWidth - 32
    const containerHeight = container.clientHeight - 32

    const scaleX = containerWidth / canvasWidth
    const scaleY = containerHeight / canvasHeight

    return Math.min(scaleX, scaleY, 1)
  }, [canvasWidth, canvasHeight])

  // Save state for undo/redo
  const saveState = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const json = JSON.stringify(canvas.toJSON())
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(json)

    if (newHistory.length > 20) {
      newHistory.shift()
    }

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const onObjectsChangeRef = useRef(onObjectsChange);
  const saveStateRef = useRef(saveState);
  const onToolChangeRef = useRef(onToolChange);
  const backgroundColorRef = useRef(backgroundColor);
  const toolRef = useRef<'select' | 'brush' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser' | 'crop'>(tool);

  useEffect(() => {
    onObjectsChangeRef.current = onObjectsChange;
    saveStateRef.current = saveState;
    toolRef.current = tool;
    backgroundColorRef.current = backgroundColor;
  }, [onObjectsChange, saveState, tool, backgroundColor]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: backgroundColorRef.current,
      selection: toolRef.current === 'select',
      preserveObjectStacking: true,
      targetFindTolerance: 0
    })

    fabricRef.current = canvas

    // Set up event listeners
    canvas.on('object:added', () => {
      saveStateRef.current()
      onObjectsChangeRef.current?.(canvas.getObjects().length)
    })

    canvas.on('object:removed', () => {
      saveStateRef.current()
      onObjectsChangeRef.current?.(canvas.getObjects().length)
    })

    canvas.on('object:modified', () => {
      saveStateRef.current()
    })

    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    return () => {
      canvas.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally empty: canvas should only initialize once, not on resize
  }, [])

  // Update background color when it changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // In Photo Mode, we use backgroundImage, so backgroundColor should be transparent
    if (canvasMode === 'photo') {
      canvas.backgroundColor = 'transparent'
    } else {
      canvas.backgroundColor = backgroundColorRef.current
    }
    canvas.renderAll()
  }, [backgroundColorRef, canvasMode])

  // Update tool mode
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Reset drawing mode
    canvas.isDrawingMode = false
    canvas.selection = false
    canvas.defaultCursor = 'default'

    // Remove any active brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize
      canvas.freeDrawingBrush.color = color
    }

    switch (toolRef.current) {
      case 'select':
        canvas.selection = true
        canvas.defaultCursor = 'default'
        break
      case 'brush':
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
        canvas.freeDrawingBrush.width = brushSize
        canvas.freeDrawingBrush.color = color
        break
      case 'eraser':
        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.defaultCursor = 'cell' // Visual indicator for eraser
        break
      case 'crop':
        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.defaultCursor = 'crosshair'
        break
      default:
        canvas.selection = false
        canvas.defaultCursor = 'crosshair'
    }
  }, [tool, brushSize, color])

  // Cursor Overlay Logic
  useEffect(() => {
    const canvas = fabricRef.current
    const cursor = cursorRef.current
    if (!canvas || !cursor) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCursor = (opt: any) => {
      if (!opt.e) return
      const { clientX, clientY } = opt.e as MouseEvent
      cursor.style.transform = `translate(${clientX}px, ${clientY}px)`

      const isVisibleTool = ['brush', 'eraser', 'text', 'line', 'arrow', 'circle', 'rectangle'].includes(toolRef.current)
      if (isVisibleTool) {
        cursor.style.opacity = '0.5'
      } else {
        cursor.style.opacity = '0'
      }
    }

    const hideCursor = () => { cursor.style.opacity = '0' }
    const showCursor = () => { cursor.style.opacity = '0.5' }

    // Update cursor size/style
    let size = brushSize
    if (toolRef.current === 'text') size = fontSize

    // Scale cursor based on canvas zoom
    const displaySize = size * scale

    cursor.style.width = `${displaySize}px`
    cursor.style.height = `${displaySize}px`
    cursor.style.marginLeft = `-${displaySize / 2}px`
    cursor.style.marginTop = `-${displaySize / 2}px`
    cursor.style.borderColor = color

    if (toolRef.current === 'eraser') {
      cursor.style.borderColor = '#000000'
      cursor.style.backgroundColor = '#ffffff'
    } else {
      cursor.style.backgroundColor = color
    }

    canvas.on('mouse:move', updateCursor)
    canvas.on('mouse:out', hideCursor)
    canvas.on('mouse:over', showCursor)

    return () => {
      canvas.off('mouse:move', updateCursor)
      canvas.off('mouse:out', hideCursor)
      canvas.off('mouse:over', showCursor)
    }
  }, [brushSize, fontSize, color, tool, scale])

  // Handle click-and-drag shape creation
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    let isErasing = false

    const handleMouseDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      // Eraser logic: Delete object on click
      if (toolRef.current === 'eraser') {
        isErasing = true
        if (e.target && !(e.target as fabric.Object & { isBackground?: boolean }).isBackground) {
          canvas.remove(e.target)
          canvas.requestRenderAll()
          saveStateRef.current()
        }
        return
      }

      if (toolRef.current === 'select' || toolRef.current === 'brush') return

      // const canvas = fabricRef.current! // Using outer canvas variable to avoid TDZ
      const pointer = canvas.getPointer(e.e)
      setIsDrawingShape(true)
      setShapeStartPoint({ x: pointer.x, y: pointer.y })

      canvas.skipTargetFind = true;
      canvas.discardActiveObject();
      canvas.selection = false;

      // Disable selecting objects while drawing
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      // Handle text tool separately - it doesn't use drag
      if (toolRef.current === 'text') {
        const text = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y,
          fontSize: fontSize,
          fill: color,
          editable: true
        })
        canvas.add(text)

        // Restore canvas interactions before entering edit mode
        canvas.skipTargetFind = false
        canvas.selection = true
        canvas.forEachObject(obj => {
          obj.selectable = true
          obj.evented = true
        })

        canvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll() // Select placeholder text for easy replacement
        setIsDrawingShape(false)

        // Switch to select tool after placing text
        onToolChangeRef.current?.('select')
        return
      }

      let shape: fabric.Object | null = null

      switch (toolRef.current) {
        case 'rectangle':
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 1,
            height: 1,
            fill: fillMode ? color : 'transparent',
            stroke: fillMode ? 'transparent' : color,
            strokeWidth: fillMode ? 0 : brushSize,
            selectable: false
          })
          break
        case 'circle':
          shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 1,
            fill: fillMode ? color : 'transparent',
            stroke: fillMode ? 'transparent' : color,
            strokeWidth: fillMode ? 0 : brushSize,
            selectable: false
          })
          break
        case 'line':
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: brushSize,
            selectable: false
          })
          break
        case 'arrow':
          // For arrow, start with just a line
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: brushSize,
            selectable: false
          })
          break
        case 'crop':
          // Remove any existing crop rectangle
          canvas.getObjects().forEach((obj) => {
            const fabricObj = obj as fabric.FabricObject & { data?: Record<string, boolean> };
            if (fabricObj.data?.isCropRect) {
              canvas.remove(fabricObj);
            }
          });

          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 1,
            height: 1,
            fill: 'rgba(0, 0, 0, 0.3)',
            stroke: '#ff4444',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            data: { isCropRect: true }
          });
          break;
      }

      if (shape) {
        canvas.add(shape)
        setCurrentShape(shape)
        if (toolRef.current === 'crop') {
          canvas.selection = false
          canvas.defaultCursor = 'crosshair'
          canvas.renderAll()
        }
      }
    }

    const handleMouseMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      // Eraser logic: Delete objects while dragging
      if (toolRef.current === 'eraser' && isErasing) {
        if (e.target && !(e.target as fabric.Object & { isBackground?: boolean }).isBackground) {
          canvas.remove(e.target)
          canvas.requestRenderAll()
          // Note: saving state on every move might be expensive, rely on mouseUp or throttled?
          // For now, save on mouse up is better, but immediate feedback is needed.
        }
        return
      }

      if (!isDrawingShape || !shapeStartPoint || !currentShape) return

      const pointer = canvas.getPointer(e.e)
      const width = Math.abs(pointer.x - shapeStartPoint.x)
      const height = Math.abs(pointer.y - shapeStartPoint.y)
      const left = Math.min(pointer.x, shapeStartPoint.x)
      const top = Math.min(pointer.y, shapeStartPoint.y)

      // Crop tool updates
      if (toolRef.current === 'crop') {
        // Ensure the crop rectangle stays within canvas bounds
        const boundedLeft = Math.max(0, left)
        const boundedTop = Math.max(0, top)
        const boundedRight = Math.min(canvas.width || 0, left + width)
        const boundedBottom = Math.min(canvas.height || 0, top + height)

        currentShape.set({
          left: boundedLeft,
          top: boundedTop,
          width: boundedRight - boundedLeft,
          height: boundedBottom - boundedTop
        });

        canvas.renderAll();
        return;
      }

      switch (toolRef.current) {
        case 'rectangle':
          currentShape.set({
            left: left,
            top: top,
            width: width,
            height: height
          })
          break
        case 'circle':
          const radius = Math.sqrt(width * width + height * height) / 2
          currentShape.set({
            left: shapeStartPoint.x - radius,
            top: shapeStartPoint.y - radius,
            radius: radius
          })
          break
        case 'line':
        case 'arrow':
          (currentShape as fabric.Line).set({
            x2: pointer.x,
            y2: pointer.y
          })
          break
      }

      canvas.renderAll()
    }

    const handleMouseUp = (_e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
      if (toolRef.current === 'eraser') {
        if (isErasing) {
          isErasing = false
          saveStateRef.current()
        }
        return
      }

      if (!isDrawingShape || !currentShape) return

      // Restore interactions
      canvas.skipTargetFind = false;
      canvas.selection = true;

      canvas.forEachObject(obj => {
        obj.selectable = true;
        obj.evented = true;
      });

      currentShape.set({ selectable: true, evented: true });


      if (toolRef.current === 'crop') {
        const rect = currentShape as fabric.Rect
        const { left = 0, top = 0, width = 0, height = 0 } = rect

        if (width > 10 && height > 10) {
          // First remove all existing images
          const objects = canvas.getObjects()
          objects.forEach(obj => {
            if (obj.type === 'image') {
              canvas.remove(obj)
            }
          })

          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          // Get zoom level for coordinate transformation
          const zoom = canvas.getZoom();

          // Set destination canvas to match the zoomed source dimensions
          // This ensures 1:1 pixel mapping without distortion
          const sourceWidth = width * zoom;
          const sourceHeight = height * zoom;

          tempCanvas.width = sourceWidth;
          tempCanvas.height = sourceHeight;

          // Draw the selected crop area from the zoomed canvas
          // Source and destination now use consistent coordinate systems
          tempCtx.drawImage(
            canvas.lowerCanvasEl,
            left * zoom,      // source x (zoomed pixel space)
            top * zoom,       // source y (zoomed pixel space)
            sourceWidth,      // source width (zoomed)
            sourceHeight,     // source height (zoomed)
            0,                // dest x
            0,                // dest y
            sourceWidth,      // dest width (matches source for 1:1 copy)
            sourceHeight      // dest height (matches source for 1:1 copy)
          );

          const croppedDataUrl = tempCanvas.toDataURL('image/png');

          // Create a fabric.Image from the cropped area
          fabric.FabricImage.fromURL(croppedDataUrl).then(img => {
            img.set({
              left,
              top,
              selectable: true,
              hasControls: true, // Allows resize/rotate
              evented: true
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            // Save state after adding
            saveStateRef.current()
          })
        }

        // Remove the crop rectangle
        canvas.remove(currentShape)

        // Restore interaction with other objects
        canvas.forEachObject(obj => {
          obj.selectable = true
          obj.evented = true;
        });

        // Reset state
        setIsDrawingShape(false);
        setShapeStartPoint(null);
        setCurrentShape(null)

        // Switch back to select tool
        onToolChangeRef.current?.('select')
        return
      }

      // Arrow handling (unchanged)
      if (toolRef.current === 'arrow' && currentShape instanceof fabric.Line) {
        const x1 = currentShape.x1 || 0
        const y1 = currentShape.y1 || 0
        const x2 = currentShape.x2 || 0
        const y2 = currentShape.y2 || 0

        // Calculate arrow angle
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI

        // Create triangle for arrow head
        const triangle = new fabric.Triangle({
          left: x2,
          top: y2,
          width: 15,
          height: 15,
          fill: color,
          angle: angle + 90,
          originX: 'center',
          originY: 'center'
        })

        // Group line and triangle
        const arrow = new fabric.Group([currentShape, triangle])
        canvas.remove(currentShape)
        canvas.add(arrow)
        canvas.setActiveObject(arrow)
      } else {
        // Keep the shape selected after creation
        canvas.setActiveObject(currentShape)
      }

      // Reset drawing state
      setIsDrawingShape(false)
      setShapeStartPoint(null)
      setCurrentShape(null)

      // AUTO-SWITCH TO SELECT TOOL AFTER CREATING SHAPE
      // This ensures user can immediately manipulate the shape they just created
      if (onToolChangeRef.current && (toolRef.current === 'rectangle' || toolRef.current === 'circle' || toolRef.current === 'line' || toolRef.current === 'arrow')) {
        onToolChangeRef.current('select')
      }

      canvas.renderAll()
    }

    // Native Size Indicator
    const handleScaling = (e: { target?: fabric.Object }) => {
      const target = e.target
      if (!target || target.type !== 'image') return

      // standard scaleX/scaleY are relative to native width/height
      const isUpscaled = (target.scaleX || 1) > 1 || (target.scaleY || 1) > 1

      if (isUpscaled) {
        target.set({
          borderColor: '#EF4444', // Red-500
          borderScaleFactor: 2,
          cornerColor: '#EF4444',
          borderDashArray: [4, 4]
        })
      } else {
        // Restore defaults usually used by Fabric or our theme
        target.set({
          borderColor: 'rgba(102, 169, 255, 0.75)',
          borderScaleFactor: 1,
          cornerColor: 'rgba(102, 169, 255, 1)',
          borderDashArray: undefined
        })
      }
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)
    canvas.on('object:scaling', handleScaling)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      canvas.off('object:scaling', handleScaling)
    }
  }, [color, brushSize, fillMode, fontSize, isDrawingShape, shapeStartPoint, currentShape])

  // Clear background only (preserves canvas size and other objects)
  const clearBackground = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if ((obj as fabric.Object & { isBackground?: boolean }).isBackground) {
        canvas.remove(obj)
      }
    })
    canvas.renderAll()
    saveStateRef.current()
  }, [])

  // Import image function
  const importImage = useCallback((imageUrl: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    // Validate URL format
    if (!imageUrl || typeof imageUrl !== 'string') {
      return
    }

    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      if (!img || !img.width || !img.height) {
        return
      }

      // Photo Mode: Image becomes canvas background, canvas resizes to fit
      if (canvasMode === 'photo') {
        console.log('[FabricCanvas] Photo Mode - importing as background')
        const imgWidth = img.width!
        const imgHeight = img.height!
        console.log('[FabricCanvas] Image dimensions:', imgWidth, 'x', imgHeight)

        // Notify parent of new canvas size
        if (onCanvasSizeChange) {
          console.log('[FabricCanvas] Calling onCanvasSizeChange:', imgWidth, imgHeight)
          onCanvasSizeChange(imgWidth, imgHeight)
        } else {
          console.log('[FabricCanvas] WARNING: onCanvasSizeChange not provided!')
        }

        // Set image as canvas background
        canvas.backgroundImage = img
        // Ensure background image is centered/placed correctly relative to canvas 
        // (Since canvas size matches image size, standard origin is fine)

        // Remove any old background objects (cleaning up legacy)
        const objects = canvas.getObjects()
        objects.forEach(obj => {
          if ((obj as fabric.Object & { isBackground?: boolean }).isBackground) {
            canvas.remove(obj)
          }
        })

        canvas.requestRenderAll()
        canvas.renderAll()
        saveStateRef.current()
        return
      }

      // Canvas Mode: Normal import behavior
      let scale: number
      let left: number
      let top: number

      if (imageImportMode === 'fill') {
        // Fill mode: scale image to cover entire canvas (may crop edges)
        scale = Math.max(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        )
        img.scale(scale)
        // Center the image (parts may extend beyond canvas)
        left = (canvas.width! - img.getScaledWidth()) / 2
        top = (canvas.height! - img.getScaledHeight()) / 2
      } else {
        // Fit mode: scale to fit within 80% of canvas with margins
        const maxWidth = canvas.width! * 0.8
        const maxHeight = canvas.height! * 0.8

        scale = Math.min(
          maxWidth / img.width!,
          maxHeight / img.height!,
          1
        )
        img.scale(scale)
        left = (canvas.width! - img.getScaledWidth()) / 2
        top = (canvas.height! - img.getScaledHeight()) / 2
      }

      img.set({ left, top, lockUniScaling: true })

      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      saveStateRef.current()
    }).catch((error) => {
      console.error('Failed to load image:', error)
    })
  }, [imageImportMode, canvasMode, onCanvasSizeChange])

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const canvas = fabricRef.current
    if (!canvas) return

    e.preventDefault()

    // Check for pasted files (images)
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Handle pasted images
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (blob) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const imageUrl = event.target?.result as string
              importImage(imageUrl)
            }
            reader.readAsDataURL(blob)
            return // Exit after handling image
          }
        }
      }
    }

    // Handle pasted text
    const text = e.clipboardData?.getData('text/plain')
    if (text) {
      const textObject = new fabric.Textbox(text, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        fontSize: 20,
        fill: color,
        width: 200,
        originX: 'center',
        originY: 'center'
      })
      canvas.add(textObject)
      canvas.setActiveObject(textObject)
      canvas.renderAll()
    }
  }, [color, importImage])

  // Handle copy/cut operations
  const handleCopy = useCallback((e: ClipboardEvent, isCut: boolean = false) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    e.preventDefault()

    // Store the object for later paste
    const objectData = activeObject.toObject()
    e.clipboardData?.setData('application/json', JSON.stringify(objectData))

    if (isCut) {
      canvas.remove(activeObject)
      canvas.renderAll()
    }
  }, [])

  // Object manipulation functions
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    // Remove all selected objects
    canvas.remove(...activeObjects)
    canvas.discardActiveObject()
    canvas.renderAll()

    // Save state for undo/redo
    saveStateRef.current()
  }, [])

  // Set up clipboard event listeners
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => handlePaste(e)
    const handleCopyEvent = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS') return
      handleCopy(e, false)
    }
    const handleCutEvent = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS') return
      handleCopy(e, true)
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current
      if (!canvas) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        const activeObjects = canvas.getActiveObjects()
        if (activeObjects.length > 0) {
          deleteSelected()
          return
        }
      }

      // Check if canvas or its container has focus
      const canvasElement = canvasRef.current
      const containerElement = containerRef.current
      if (!canvasElement?.contains(document.activeElement) &&
        !containerElement?.contains(document.activeElement) &&
        document.activeElement !== canvasElement &&
        document.activeElement !== containerElement) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        // Trigger paste programmatically using clipboardManager
        clipboardManager.readImage().then(imageDataURL => {
          if (imageDataURL) {
            importImage(imageDataURL)
            return
          }
          // If no image, try text
          return clipboardManager.readText()
        }).then(text => {
          if (text) {
            const textObject = new fabric.Textbox(text, {
              left: canvas.width! / 2,
              top: canvas.height! / 2,
              fontSize: 20,
              fill: color,
              width: 200,
              originX: 'center',
              originY: 'center'
            })
            canvas.add(textObject)
            canvas.setActiveObject(textObject)
            canvas.renderAll()
          }
        }).catch(err => {
          console.log('Clipboard paste failed:', err)
        })
      }
    }

    document.addEventListener('paste', handlePasteEvent)
    document.addEventListener('copy', handleCopyEvent)
    document.addEventListener('cut', handleCutEvent)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('paste', handlePasteEvent)
      document.removeEventListener('copy', handleCopyEvent)
      document.removeEventListener('cut', handleCutEvent)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlePaste, handleCopy, color, importImage, deleteSelected])

  // Undo function
  const undo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndex <= 0) return

    const newIndex = historyIndex - 1
    canvas.loadFromJSON(history[newIndex]).then(() => {
      setHistoryIndex(newIndex)
      canvas.renderAll()
    })
  }, [history, historyIndex])

  // Redo function
  const redo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndex >= history.length - 1) return

    const newIndex = historyIndex + 1
    canvas.loadFromJSON(history[newIndex]).then(() => {
      setHistoryIndex(newIndex)
      canvas.renderAll()
    })
  }, [history, historyIndex])

  // Clear canvas
  const clear = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.clear()
    canvas.backgroundColor = backgroundColorRef.current
    canvas.renderAll()
    saveState()
  }, [saveState])

  // Export canvas
  const exportCanvas = useCallback((format: string = 'png') => {
    const canvas = fabricRef.current
    if (!canvas) return ''

    return canvas.toDataURL({
      format: format as fabric.ImageFormat,
      quality: 0.9,
      multiplier: 1
    })
  }, [])

  const rotateSelected = useCallback((angle: number) => {
    const canvas = fabricRef.current
    if (!canvas || !selectedObject) return

    selectedObject.rotate((selectedObject.angle || 0) + angle)
    canvas.renderAll()
    saveState()
  }, [selectedObject, saveState])

  const flipSelected = useCallback((direction: 'horizontal' | 'vertical') => {
    const canvas = fabricRef.current
    if (!canvas || !selectedObject) return

    if (direction === 'horizontal') {
      selectedObject.set('flipX', !selectedObject.flipX)
    } else {
      selectedObject.set('flipY', !selectedObject.flipY)
    }
    canvas.renderAll()
    saveState()
  }, [selectedObject, saveState])

  const toggleLockSelected = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !selectedObject) return

    const locked = !selectedObject.lockMovementX
    selectedObject.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked
    })
    canvas.renderAll()
  }, [selectedObject])

  // Zoom functions
  const handleZoomIn = () => {
    setAutoScale(false)
    setScale(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setAutoScale(false)
    setScale(prev => Math.max(prev * 0.8, 0.2))
  }

  const handleFitToScreen = () => {
    setAutoScale(true)
    const newScale = calculateAutoScale()
    setScale(newScale)
  }

  // Update scale when auto-scale is enabled
  useEffect(() => {
    if (autoScale) {
      const newScale = calculateAutoScale()
      setScale(newScale)
    }

    const handleResize = () => {
      if (autoScale) {
        const newScale = calculateAutoScale()
        setScale(newScale)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [autoScale, calculateAutoScale])

  // Update canvas zoom
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    console.log('[FabricCanvas] Updating dimensions/scale:', { width: canvasWidth * scale, height: canvasHeight * scale, scale })
    canvas.setZoom(scale)
    canvas.setDimensions({
      width: canvasWidth * scale,
      height: canvasHeight * scale
    })
    canvas.calcOffset()
    canvas.requestRenderAll()
    canvas.requestRenderAll()
  }, [scale, canvasWidth, canvasHeight])

  // Crop Tool Logic
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (tool === 'crop') {
      const activeObj = canvas.getActiveObject()
      if (!activeObj || activeObj.type !== 'image') {
        return
      }

      const image = activeObj as fabric.Image

      // Create Crop Box
      // Initial bounds: 80% of image size, centered
      const initWidth = image.getScaledWidth() * 0.8
      const initHeight = image.getScaledHeight() * 0.8
      const initLeft = image.left! + (image.getScaledWidth() - initWidth) / 2
      const initTop = image.top! + (image.getScaledHeight() - initHeight) / 2

      const cropRect = new fabric.Rect({
        left: initLeft, top: initTop,
        width: initWidth, height: initHeight,
        fill: 'transparent',
        stroke: '#fff', strokeWidth: 2, strokeDashArray: [5, 5],
        cornerColor: '#fff', cornerSize: 10,
        transparentCorners: false,
        lockRotation: true,
        hasRotatingPoint: false,
        excludeFromExport: true
      })

      // Lock the target image so it can't be selected/moved while cropping
      image.set({
        selectable: false,
        evented: false,
        opacity: 0.5 // Dim the image to focus on crop area
      })

      canvas.add(cropRect)
      canvas.setActiveObject(cropRect)
      cropRectRef.current = cropRect
      cropTargetRef.current = image

      canvas.requestRenderAll()

    } else {
      // Cleanup Crop Mode
      const canvas = fabricRef.current
      if (canvas) {
        if (cropRectRef.current) canvas.remove(cropRectRef.current)

        // Restore target image state if it still exists
        if (cropTargetRef.current && canvas.contains(cropTargetRef.current)) {
          cropTargetRef.current.set({
            selectable: true,
            evented: true,
            opacity: 1
          })
        }

        canvas.requestRenderAll()
      }
      cropRectRef.current = null
      cropTargetRef.current = null
    }
  }, [tool])

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clear,
    clearBackground,
    exportCanvas,

    importImage,
    isEmpty: () => {
      if (!fabricRef.current) return true
      return fabricRef.current.getObjects().length === 0 && !fabricRef.current.backgroundImage
    },
    setCropAspectRatio: (ratio: number | null) => {
      const cropRect = cropRectRef.current
      const canvas = fabricRef.current
      if (!cropRect || !canvas) return

      if (ratio) {
        // Force aspect ratio
        const currentW = cropRect.getScaledWidth()
        const newH = currentW / ratio

        cropRect.set({
          width: currentW,
          height: newH,
          scaleX: 1,
          scaleY: 1,
          lockUniScaling: true
        })
      } else {
        cropRect.set({ lockUniScaling: false })
      }
      canvas.requestRenderAll()
    },
    applyCrop: async () => {
      const cropRect = cropRectRef.current
      const target = cropTargetRef.current
      const canvas = fabricRef.current
      if (!cropRect || !target || !canvas) return

      // Destructive Crop: Export area -> New Image
      const dataUrl = canvas.toDataURL({
        left: cropRect.left,
        top: cropRect.top,
        width: cropRect.getScaledWidth(),
        height: cropRect.getScaledHeight(),
        format: 'png',
        multiplier: 1 / canvas.getZoom()
      })

      const newImg = await fabric.Image.fromURL(dataUrl)
      newImg.set({
        left: cropRect.left,
        top: cropRect.top,
        lockUniScaling: true
      })
      canvas.add(newImg)
      canvas.remove(target)
      canvas.setActiveObject(newImg)
    },
    getDimensions: () => ({ width: canvasWidth, height: canvasHeight })
  }))

  return (
    <Card className="bg-card/50 border-border h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col relative">
        {/* Mobile: Floating Zoom Controls */}
        <div className="sm:hidden fixed left-4 z-30 flex flex-col gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
          <Button
            size="sm"
            onClick={handleZoomIn}
            disabled={!fabricRef.current}
            className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </Button>
          <Button
            size="sm"
            onClick={handleFitToScreen}
            disabled={!fabricRef.current}
            className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
            aria-label="Fit to screen"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </Button>
          <Button
            size="sm"
            onClick={handleZoomOut}
            disabled={!fabricRef.current}
            className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Desktop: Existing Top Controls */}
        {/* Desktop: Unified Top Controls */}
        <div className="hidden sm:flex items-center justify-between gap-2 mb-2 p-1 bg-card/50 border border-border/50 rounded-lg">
          {/* Left: App Controls (Import, Mode, Undo - Passed from Parent) */}
          <div className="flex items-center gap-1">
            {headerContent}
          </div>

          {/* Center: Model Selector etc */}
          <div className="flex items-center gap-1">
            {props.centerContent}
          </div>

          {/* Right: Canvas Controls (Zoom, Edit, etc.) */}
          <div className="flex items-center gap-1">
            <div className="h-4 w-px bg-border mx-1" />
            <Button size="sm" onClick={handleZoomOut} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleFitToScreen} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Fit to Screen">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleZoomIn} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </Button>

            {selectedObject && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                <Button size="sm" onClick={() => rotateSelected(45)} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Rotate 45°">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => flipSelected('horizontal')} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Flip horizontal">
                  <FlipHorizontal className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => flipSelected('vertical')} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Flip vertical">
                  <FlipVertical className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => onToolChange?.('crop')} variant="ghost" className={cn("h-7 w-7 p-0 text-muted-foreground hover:text-foreground", tool === 'crop' && "bg-primary/20 text-primary")} title="Crop Image">
                  <Crop className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={toggleLockSelected} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Lock/Unlock">
                  {selectedObject?.lockMovementX ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={deleteSelected} variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Delete selected">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 bg-background p-4 relative flex items-center justify-center overflow-auto border-2 border-primary/50"
          tabIndex={0}
          style={{
            touchAction: 'none',
            WebkitOverflowScrolling: 'auto',
            overscrollBehavior: 'contain'
          }}
        >
          <canvas
            ref={canvasRef}
            className="border-4 border-primary shadow-2xl"
          />

          <div
            ref={cursorRef}
            className="fixed pointer-events-none rounded-full border-2 z-[9999] opacity-0 transition-opacity duration-75 ease-out"
            style={{
              top: 0,
              left: 0
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
})

FabricCanvas.displayName = 'FabricCanvas'

export { FabricCanvas }