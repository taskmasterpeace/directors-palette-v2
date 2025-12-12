"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ImageIcon, Layout, Sparkles, Film, Images, Wand2 } from "lucide-react";
import Image from "next/image";
import { useLayoutStore } from "@/store/layout.store";
import { ShotCreator } from "@/features/shot-creator";
import { ShotAnimator } from "@/features/shot-animator";
import { LayoutAnnotation } from "@/features/layout-annotation";
import { Storyboard } from "@/features/storyboard";
import { Wildcards } from "@/features/wildcards";
import { UnifiedImageGallery } from "@/features/shot-creator/components/unified-gallery/UnifiedImageGallery";
import { ScreenNavigationIconSelector } from "@/components/ScreenNavigationIconSelector";
import { useGalleryLoader } from "@/features/shot-creator/hooks/useGalleryLoader";
import { CreditsDisplay } from "@/features/credits";
import { UserMenu } from "@/components/UserMenu";

export default function Home() {
  const { activeTab, setActiveTab } = useLayoutStore();

  // Load gallery data for pagination to work in Gallery tab
  useGalleryLoader();
  return (
    <div className="container mx-auto max-w-none w-full sm:w-[95%] p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Image
                src="/favicon.ico"
                alt="Directors Palette"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <span className="hidden sm:inline">Directors Palette</span>
              <span className="sm:hidden">Directors Palette</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              AI-powered visual storytelling and image generation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreditsDisplay />
            <UserMenu />
          </div>
        </div>

        {/* Mobile Screen Navigation Icon */}
        <ScreenNavigationIconSelector
          value={activeTab}
          onChange={setActiveTab}
        />

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 sm:space-y-4">
          {/* Desktop: Original Tab Layout */}
          <TabsList className="hidden sm:grid grid-cols-6 w-full max-w-none min-h-[48px] h-auto">
            {/* shot-creator */}
            <TabsTrigger value="shot-creator" className="flex items-center gap-2 min-h-[44px]">
              <Sparkles className="w-4 h-4" />
              <span className="hidden lg:inline">Shot Creator</span>
            </TabsTrigger>
            {/* shot-animator */}
            <TabsTrigger value="shot-animator" className="flex items-center gap-2 min-h-[44px]">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Shot Animator</span>
            </TabsTrigger>
            {/* layout-annotation */}
            <TabsTrigger value="layout-annotation" className="flex items-center gap-2 min-h-[44px]">
              <Layout className="w-4 h-4" />
              <span className="hidden lg:inline">Layout & Annotation</span>
            </TabsTrigger>
            {/* storyboard */}
            <TabsTrigger value="storyboard" className="flex items-center gap-2 min-h-[44px]">
              <Film className="w-4 h-4" />
              <span className="hidden lg:inline">Storyboard</span>
            </TabsTrigger>
            {/* gallery */}
            <TabsTrigger value="gallery" className="flex items-center gap-2 min-h-[44px]">
              <Images className="w-4 h-4" />
              <span className="hidden lg:inline">Gallery</span>
            </TabsTrigger>
            {/* wildcards */}
            <TabsTrigger value="wildcards" className="flex items-center gap-2 min-h-[44px]">
              <Wand2 className="w-4 h-4" />
              <span className="hidden lg:inline">Wildcards</span>
            </TabsTrigger>
          </TabsList>

          {/* Shot Creator Tab - Clean Component with Paste Buttons */}
          <TabsContent value="shot-creator" className="space-y-4">
            <ShotCreator />
          </TabsContent>

          {/* Shot Animator Tab - SeeeDance Video Generation */}
          <TabsContent value="shot-animator" className="space-y-4">
            <ShotAnimator />
          </TabsContent>

          {/* Complete Layout & Annotation Editor Tab */}
          <TabsContent value="layout-annotation">
            <LayoutAnnotation />
          </TabsContent>

          {/* Storyboard Tab - Visual Storyboard Generation */}
          <TabsContent value="storyboard" className="space-y-4">
            <Storyboard />
          </TabsContent>

          {/* Gallery Tab - Unified Image Gallery */}
          <TabsContent value="gallery" className="space-y-4">
            <UnifiedImageGallery currentTab="gallery" mode="full" />
          </TabsContent>

          {/* Wildcards Tab - Wildcard Browser with AI Assistant */}
          <TabsContent value="wildcards" className="space-y-4">
            <Wildcards />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
