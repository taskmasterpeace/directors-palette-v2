/**
 * Unit tests for useGallerySelection hook
 *
 * Tests selection scenarios:
 * - Single click toggle selection
 * - Shift+click range selection (forward and backward)
 * - Ctrl/Cmd+click toggle selection
 * - Select all / select none
 * - Selection state tracking
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGallerySelection } from './useGallerySelection'

// Helper to create a mock MouseEvent with modifier keys
function createMouseEvent(options: {
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
} = {}): React.MouseEvent {
  return {
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
  } as React.MouseEvent
}

describe('useGallerySelection', () => {
  // Sample ordered items for testing
  const orderedItems = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6', 'img7', 'img8']

  describe('Initial State', () => {
    it('should start with empty selection', () => {
      const { result } = renderHook(() => useGallerySelection())

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should have isSelected return false for any item initially', () => {
      const { result } = renderHook(() => useGallerySelection())

      expect(result.current.isSelected('img1')).toBe(false)
      expect(result.current.isSelected('anyId')).toBe(false)
    })
  })

  describe('Single Click Toggle Selection', () => {
    it('should select an item on first click', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('img1')
      })

      expect(result.current.selectedIds.has('img1')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('img1')).toBe(true)
    })

    it('should deselect an item on second click', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('img1')
      })
      expect(result.current.isSelected('img1')).toBe(true)

      act(() => {
        result.current.toggleSelect('img1')
      })
      expect(result.current.isSelected('img1')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('should allow selecting multiple items independently', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('img1')
        result.current.toggleSelect('img3')
        result.current.toggleSelect('img5')
      })

      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(false)
      expect(result.current.isSelected('img3')).toBe(true)
      expect(result.current.isSelected('img4')).toBe(false)
      expect(result.current.isSelected('img5')).toBe(true)
    })
  })

  describe('Select All / Select None', () => {
    it('should select all provided items', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3', 'img4'])
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(true)
      expect(result.current.isSelected('img4')).toBe(true)
    })

    it('should clear all selections with selectNone', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3'])
      })
      expect(result.current.selectedCount).toBe(3)

      act(() => {
        result.current.selectNone()
      })

      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isSelected('img1')).toBe(false)
      expect(result.current.isSelected('img2')).toBe(false)
      expect(result.current.isSelected('img3')).toBe(false)
    })

    it('should replace existing selection when selectAll is called', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('imgA')
        result.current.toggleSelect('imgB')
      })
      expect(result.current.selectedCount).toBe(2)

      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3'])
      })

      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('imgA')).toBe(false)
      expect(result.current.isSelected('imgB')).toBe(false)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(true)
    })
  })

  describe('Shift+Click Range Selection', () => {
    it('should select range forward (from earlier to later item)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // First, select img2 to establish anchor
      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent())
      })
      expect(result.current.isSelected('img2')).toBe(true)

      // Shift+click on img5 to select range img2-img5
      act(() => {
        result.current.handleSelectWithModifiers('img5', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img1')).toBe(false) // Before range
      expect(result.current.isSelected('img2')).toBe(true)  // Start
      expect(result.current.isSelected('img3')).toBe(true)  // In range
      expect(result.current.isSelected('img4')).toBe(true)  // In range
      expect(result.current.isSelected('img5')).toBe(true)  // End
      expect(result.current.isSelected('img6')).toBe(false) // After range
    })

    it('should select range backward (from later to earlier item)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // First, select img6 to establish anchor
      act(() => {
        result.current.handleSelectWithModifiers('img6', orderedItems, createMouseEvent())
      })
      expect(result.current.isSelected('img6')).toBe(true)

      // Shift+click on img3 to select range img3-img6
      act(() => {
        result.current.handleSelectWithModifiers('img3', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img2')).toBe(false) // Before range
      expect(result.current.isSelected('img3')).toBe(true)  // Start
      expect(result.current.isSelected('img4')).toBe(true)  // In range
      expect(result.current.isSelected('img5')).toBe(true)  // In range
      expect(result.current.isSelected('img6')).toBe(true)  // End
      expect(result.current.isSelected('img7')).toBe(false) // After range
    })

    it('should add to existing selection (not replace)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Pre-select img1
      act(() => {
        result.current.toggleSelect('img1')
      })
      expect(result.current.isSelected('img1')).toBe(true)

      // Select img4 as anchor
      act(() => {
        result.current.handleSelectWithModifiers('img4', orderedItems, createMouseEvent())
      })

      // Shift+click on img6 to select range img4-img6
      act(() => {
        result.current.handleSelectWithModifiers('img6', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      // img1 should still be selected (range selection adds to existing)
      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img4')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
      expect(result.current.isSelected('img6')).toBe(true)
    })

    it('should behave like toggle when no previous selection exists', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Shift+click without previous selection should just toggle
      act(() => {
        result.current.handleSelectWithModifiers('img3', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('img3')).toBe(true)
    })

    it('should update anchor for subsequent range selections', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select img2
      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent())
      })

      // Shift+click on img4 (range: img2-img4)
      act(() => {
        result.current.handleSelectWithModifiers('img4', orderedItems, createMouseEvent({ shiftKey: true }))
      })
      expect(result.current.selectedCount).toBe(3)

      // Now clear and do another shift+click from img4 (new anchor)
      act(() => {
        result.current.selectNone()
      })

      // Click img4 to set new anchor
      act(() => {
        result.current.handleSelectWithModifiers('img4', orderedItems, createMouseEvent())
      })

      // Shift+click on img7
      act(() => {
        result.current.handleSelectWithModifiers('img7', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img4')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
      expect(result.current.isSelected('img6')).toBe(true)
      expect(result.current.isSelected('img7')).toBe(true)
    })
  })

  describe('Ctrl/Cmd+Click Toggle Selection', () => {
    it('should toggle single item with Ctrl+click (Windows)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select multiple items first
      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3'])
      })

      // Ctrl+click on img2 to deselect it
      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent({ ctrlKey: true }))
      })

      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(false)
      expect(result.current.isSelected('img3')).toBe(true)
    })

    it('should toggle single item with Cmd+click (Mac)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select multiple items first
      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3'])
      })

      // Cmd+click (metaKey) on img2 to deselect it
      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent({ metaKey: true }))
      })

      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(false)
      expect(result.current.isSelected('img3')).toBe(true)
    })

    it('should add unselected item with Ctrl/Cmd+click', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select img1
      act(() => {
        result.current.toggleSelect('img1')
      })

      // Ctrl+click on img5 to add it
      act(() => {
        result.current.handleSelectWithModifiers('img5', orderedItems, createMouseEvent({ ctrlKey: true }))
      })

      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
    })

    it('should prioritize Ctrl/Cmd over Shift (toggle takes priority)', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select img2 as anchor
      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent())
      })

      // Ctrl+Shift+click should behave like Ctrl+click (toggle), not Shift+click (range)
      act(() => {
        result.current.handleSelectWithModifiers('img5', orderedItems, createMouseEvent({
          ctrlKey: true,
          shiftKey: true
        }))
      })

      // Should only toggle img5, not select range img2-img5
      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('img2')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(false) // Would be selected in range
      expect(result.current.isSelected('img4')).toBe(false) // Would be selected in range
      expect(result.current.isSelected('img5')).toBe(true)  // Toggle added this
    })

    it('should update lastSelectedId for subsequent range selections after Ctrl+click', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Ctrl+click on img4
      act(() => {
        result.current.handleSelectWithModifiers('img4', orderedItems, createMouseEvent({ ctrlKey: true }))
      })
      expect(result.current.isSelected('img4')).toBe(true)

      // Shift+click on img7 should use img4 as anchor
      act(() => {
        result.current.handleSelectWithModifiers('img7', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img4')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
      expect(result.current.isSelected('img6')).toBe(true)
      expect(result.current.isSelected('img7')).toBe(true)
    })
  })

  describe('Object Items with ID Property', () => {
    const objectItems = [
      { id: 'img1', url: 'http://example.com/1' },
      { id: 'img2', url: 'http://example.com/2' },
      { id: 'img3', url: 'http://example.com/3' },
      { id: 'img4', url: 'http://example.com/4' },
    ]

    it('should work with objects that have id property', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select first item
      act(() => {
        result.current.handleSelectWithModifiers('img1', objectItems, createMouseEvent())
      })
      expect(result.current.isSelected('img1')).toBe(true)

      // Shift+click on img3
      act(() => {
        result.current.handleSelectWithModifiers('img3', objectItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img2')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(true)
    })
  })

  describe('addToSelection', () => {
    it('should add multiple items to existing selection', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('img1')
      })

      act(() => {
        result.current.addToSelection(['img3', 'img4', 'img5'])
      })

      expect(result.current.selectedCount).toBe(4)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(true)
      expect(result.current.isSelected('img4')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
    })

    it('should not duplicate already selected items', () => {
      const { result } = renderHook(() => useGallerySelection())

      act(() => {
        result.current.toggleSelect('img1')
        result.current.toggleSelect('img2')
      })

      act(() => {
        result.current.addToSelection(['img1', 'img2', 'img3'])
      })

      expect(result.current.selectedCount).toBe(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty ordered items array for range selection', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select an item first
      act(() => {
        result.current.toggleSelect('img1')
      })

      // Shift+click with empty array should fall back to toggle
      act(() => {
        result.current.handleSelectWithModifiers('img2', [], createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(2)
    })

    it('should handle item not in ordered list for range selection', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select img1
      act(() => {
        result.current.handleSelectWithModifiers('img1', orderedItems, createMouseEvent())
      })

      // Shift+click on item not in list should fall back to toggle
      act(() => {
        result.current.handleSelectWithModifiers('unknownImg', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('unknownImg')).toBe(true)
    })

    it('should handle selecting same item as anchor for range', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Select img3
      act(() => {
        result.current.handleSelectWithModifiers('img3', orderedItems, createMouseEvent())
      })

      // Shift+click on same item (img3) should just keep it selected
      act(() => {
        result.current.handleSelectWithModifiers('img3', orderedItems, createMouseEvent({ shiftKey: true }))
      })

      expect(result.current.selectedCount).toBe(1)
      expect(result.current.isSelected('img3')).toBe(true)
    })

    it('should maintain selection state correctly after many operations', () => {
      const { result } = renderHook(() => useGallerySelection())

      // Complex sequence of operations
      act(() => {
        result.current.selectAll(['img1', 'img2', 'img3'])
      })
      expect(result.current.selectedCount).toBe(3)

      act(() => {
        result.current.handleSelectWithModifiers('img2', orderedItems, createMouseEvent({ ctrlKey: true }))
      })
      expect(result.current.selectedCount).toBe(2)

      act(() => {
        result.current.handleSelectWithModifiers('img5', orderedItems, createMouseEvent())
      })
      expect(result.current.selectedCount).toBe(3) // Toggled img5 on

      act(() => {
        result.current.handleSelectWithModifiers('img7', orderedItems, createMouseEvent({ shiftKey: true }))
      })
      // Should have img1, img3, img5, img6, img7 selected
      expect(result.current.selectedCount).toBe(5)
      expect(result.current.isSelected('img1')).toBe(true)
      expect(result.current.isSelected('img3')).toBe(true)
      expect(result.current.isSelected('img5')).toBe(true)
      expect(result.current.isSelected('img6')).toBe(true)
      expect(result.current.isSelected('img7')).toBe(true)
    })
  })
})
