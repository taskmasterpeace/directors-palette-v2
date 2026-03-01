'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfileSubTab } from './look/ProfileSubTab'
import { CharacterSheetSubTab } from './look/CharacterSheetSubTab'
import { PhotoShootSubTab } from './look/PhotoShootSubTab'
import { GallerySubTab } from './look/GallerySubTab'

type LookSubTab = 'profile' | 'character-sheet' | 'photo-shoot' | 'gallery'

export function LookTab() {
  const [subTab, setSubTab] = useState<LookSubTab>('profile')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          Look
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={subTab} onValueChange={(v) => setSubTab(v as LookSubTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1 text-xs">Profile</TabsTrigger>
            <TabsTrigger value="character-sheet" className="flex-1 text-xs">Character Sheet</TabsTrigger>
            <TabsTrigger value="photo-shoot" className="flex-1 text-xs">Photo Shoot</TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 text-xs">Gallery</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ProfileSubTab />
          </TabsContent>
          <TabsContent value="character-sheet">
            <CharacterSheetSubTab />
          </TabsContent>
          <TabsContent value="photo-shoot">
            <PhotoShootSubTab />
          </TabsContent>
          <TabsContent value="gallery">
            <GallerySubTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
