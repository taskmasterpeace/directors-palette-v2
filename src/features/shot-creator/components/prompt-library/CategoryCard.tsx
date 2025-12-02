'use client'

import { Card, CardContent } from '@/components/ui/card'

interface CategoryCardProps {
  id: string
  name: string
  icon: string
  promptCount: number
  onClick: (categoryId: string) => void
}

export function CategoryCard({ id, name, icon, promptCount, onClick }: CategoryCardProps) {
  return (
    <Card
      onClick={() => onClick(id)}
      className="bg-background border-border cursor-pointer transition-all hover:border-border hover:bg-background"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h4 className="font-medium text-white">{name}</h4>
              <p className="text-sm text-gray-400">{promptCount} prompts</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
