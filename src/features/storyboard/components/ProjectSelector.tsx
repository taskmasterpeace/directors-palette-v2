'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FolderOpen, Trash2, ChevronDown, Pencil, Check, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useStoryboardStore } from '../store'
import { listProjects, deleteProject, renameProject, estimateProjectSize, type StoryboardProject } from '../services/storyboard-db.service'
import { useStoryboardPersistence } from '../hooks/useStoryboardPersistence'
import { toast } from 'sonner'

export function ProjectSelector() {
  const [projects, setProjects] = useState<StoryboardProject[]>([])
  const [projectSizes, setProjectSizes] = useState<Record<number, number>>({})
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const activeProjectId = useStoryboardStore(s => s.activeProjectId)
  const setActiveProjectId = useStoryboardStore(s => s.setActiveProjectId)
  const resetStoryboard = useStoryboardStore(s => s.resetStoryboard)
  const { restoreProject } = useStoryboardPersistence()

  const refreshProjects = useCallback(async () => {
    try {
      const list = await listProjects()
      setProjects(list)
      // Estimate sizes in background
      const sizes: Record<number, number> = {}
      for (const p of list) {
        if (p.id != null) {
          sizes[p.id] = await estimateProjectSize(p.id)
        }
      }
      setProjectSizes(sizes)
    } catch {
      // IndexedDB may not be available
    }
  }, [])

  useEffect(() => {
    if (open) refreshProjects()
  }, [open, refreshProjects])

  const handleSwitch = async (projectId: number) => {
    resetStoryboard()
    setActiveProjectId(projectId)
    await restoreProject(projectId)
    setOpen(false)
    toast.success('Project loaded')
  }

  const handleDelete = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation()
    await deleteProject(projectId)
    if (activeProjectId === projectId) {
      resetStoryboard()
      setActiveProjectId(null)
    }
    await refreshProjects()
    toast.success('Project deleted')
  }

  const handleRenameStart = (e: React.MouseEvent, project: StoryboardProject) => {
    e.stopPropagation()
    setEditingId(project.id!)
    setEditName(project.name)
  }

  const handleRenameConfirm = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation()
    if (editName.trim()) {
      await renameProject(projectId, editName.trim())
      await refreshProjects()
    }
    setEditingId(null)
  }

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 max-w-[200px]">
          <FolderOpen className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {activeProject ? activeProject.name : 'No project'}
          </span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {projects.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No saved projects yet. Start writing a story to auto-create one.
          </div>
        ) : (
          projects.map(project => (
            <DropdownMenuItem
              key={project.id}
              className={`flex items-center gap-2 cursor-pointer ${project.id === activeProjectId ? 'bg-primary/10' : ''}`}
              onSelect={(e) => {
                if (editingId === project.id) {
                  e.preventDefault()
                  return
                }
                handleSwitch(project.id!)
              }}
            >
              {editingId === project.id ? (
                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-6 text-xs flex-1"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameConfirm(e as unknown as React.MouseEvent, project.id!)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button onClick={(e) => handleRenameConfirm(e, project.id!)} className="p-0.5 hover:text-green-500">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={handleRenameCancel} className="p-0.5 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{project.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''}</span>
                      {project.id != null && projectSizes[project.id] > 0 && (
                        <span className="text-muted-foreground/60">
                          {projectSizes[project.id] < 1024 ? `${projectSizes[project.id]}B` :
                           projectSizes[project.id] < 1048576 ? `${Math.round(projectSizes[project.id] / 1024)}KB` :
                           `${(projectSizes[project.id] / 1048576).toFixed(1)}MB`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => handleRenameStart(e, project)} className="p-1 hover:text-foreground text-muted-foreground opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => handleDelete(e, project.id!)} className="p-1 hover:text-destructive text-muted-foreground opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            resetStoryboard()
            setActiveProjectId(null)
            setOpen(false)
            toast.success('Started new project')
          }}
          className="text-xs text-muted-foreground"
        >
          + New Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
