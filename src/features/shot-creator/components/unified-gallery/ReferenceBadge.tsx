import { Badge } from '@/components/ui/badge'
import { Tag } from 'lucide-react'

interface ReferenceBadgeProps {
  reference: string
}

/**
 * Displays reference tag badge on image cards
 */
export function ReferenceBadge({ reference }: ReferenceBadgeProps) {
  if (!reference || reference.trim() === "") {
    return null
  }

  return (
    <div className="absolute top-2 right-2 pointer-events-none">
      <Badge className="bg-emerald-600 text-white px-2 py-1 text-xs">
        <Tag className="w-3 h-3 mr-1" />
        {reference}
      </Badge>
    </div>
  )
}
