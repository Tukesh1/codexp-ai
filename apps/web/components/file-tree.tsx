"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
} from "lucide-react"
import type { FileRecord } from "@/lib/api"

export type TreeNode = {
  name: string
  path: string
  type: "dir" | "file"
  language?: string | null
  sizeBytes?: number | null
  children?: TreeNode[]
}

export function buildFileTree(files: FileRecord[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean)
    let level = root
    let currentPath = ""

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isFile = index === parts.length - 1
      let node = level.find((n) => n.name === part && n.type === (isFile ? "file" : "dir"))
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "dir",
          language: isFile ? file.language : undefined,
          sizeBytes: isFile ? file.size_bytes : undefined,
          children: isFile ? undefined : [],
        }
        level.push(node)
      }
      if (!isFile && node.children) {
        level = node.children
      }
    })
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => n.children && sortNodes(n.children))
  }
  sortNodes(root)
  return root
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen) || depth < 1)
  const selected = selectedPath === node.path

  if (node.type === "file") {
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
          selected ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <FileCode2 className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate font-mono">{node.name}</span>
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-foreground/80 transition-colors hover:bg-accent/60"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 opacity-60" />
        )}
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open &&
        node.children?.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
}: {
  files: FileRecord[]
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const tree = useMemo(() => buildFileTree(files), [files])

  if (files.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No files yet. Run analysis to index the repository.
      </p>
    )
  }

  return (
    <div className="space-y-0.5 py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          defaultOpen
        />
      ))}
    </div>
  )
}
