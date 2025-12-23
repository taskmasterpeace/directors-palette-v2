"use client"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useLayoutStore } from "@/store/layout.store"
import { ShotCreator } from "@/features/shot-creator"
import { ShotAnimator } from "@/features/shot-animator"
import { LayoutAnnotation } from "@/features/layout-annotation"
import { Storyboard } from "@/features/storyboard"
import { Storybook } from "@/features/storybook"
import { PromptToolsPage } from "@/features/prompt-tools"
import MusicLabPage from "@/app/(app)/music-lab/page"
import { UnifiedImageGallery } from "@/features/shot-creator/components/unified-gallery/UnifiedImageGallery"
import { useGalleryLoader } from "@/features/shot-creator/hooks/useGalleryLoader"
import { SidebarNavigation } from "@/components/SidebarNavigation"
import { motion, AnimatePresence } from "framer-motion"
import { UserManual } from "@/features/help/components/UserManual"
import { CommunityPage } from "@/features/community"
import { SectionHeader } from "@/components/SectionHeader"

export default function Home() {
  const { activeTab, setActiveTab } = useLayoutStore();

  useGalleryLoader();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <SidebarNavigation />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="flex-1 h-full">
          <AnimatePresence mode="wait">
            {activeTab === 'shot-creator' && (
              <TabsContent key="shot-creator" value="shot-creator" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="shot-creator" />
                  <ShotCreator />
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'shot-animator' && (
              <TabsContent key="shot-animator" value="shot-animator" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="shot-animator" />
                  <ShotAnimator />
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'layout-annotation' && (
              <TabsContent key="layout-annotation" value="layout-annotation" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="layout-annotation" />
                  <LayoutAnnotation />
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'storyboard' && (
              <TabsContent key="storyboard" value="storyboard" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="storyboard" />
                  <Storyboard />
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'storybook' && (
              <TabsContent key="storybook" value="storybook" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="storybook" />
                  <div className="flex-1 overflow-hidden">
                    <Storybook />
                  </div>
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'gallery' && (
              <TabsContent key="gallery" value="gallery" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="gallery" />
                  <div className="flex-1 p-4 overflow-y-auto md:overflow-hidden">
                    <UnifiedImageGallery currentTab="gallery" mode="full" />
                  </div>
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'prompt-tools' && (
              <TabsContent key="prompt-tools" value="prompt-tools" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="prompt-tools" />
                  <div className="flex-1 overflow-hidden">
                    <PromptToolsPage />
                  </div>
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'music-lab' && (
              <TabsContent key="music-lab" value="music-lab" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="music-lab" />
                  <div className="flex-1 p-4 overflow-y-auto">
                    <MusicLabPage />
                  </div>
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'community' && (
              <TabsContent key="community" value="community" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="community" />
                  <div className="flex-1 overflow-hidden">
                    <CommunityPage />
                  </div>
                </PageTransition>
              </TabsContent>
            )}

            {activeTab === 'help' && (
              <TabsContent key="help" value="help" className="h-full m-0 p-0 outline-none data-[state=active]:flex flex-col" forceMount>
                <PageTransition>
                  <SectionHeader section="help" />
                  <div className="flex-1 overflow-hidden">
                    <UserManual />
                  </div>
                </PageTransition>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

// Reusable transition wrapper
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-1 h-full w-full flex flex-col"
    >
      {children}
    </motion.div>
  )
}
