import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * API endpoint to read documentation files for the Documentation Command Center
 * GET /api/docs/read?path=relative/path/to/file.md
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get('path')

    if (!filePath) {
        return NextResponse.json(
            { error: 'Missing path parameter' },
            { status: 400 }
        )
    }

    // Security: Only allow reading from project directory
    const projectRoot = process.cwd()

    // Convert the path - handle both forward and back slashes
    const normalizedPath = filePath.replace(/\\/g, '/')

    // Extract relative path from absolute path if needed
    let relativePath = normalizedPath
    if (normalizedPath.includes('directors-palette-v2')) {
        const parts = normalizedPath.split('directors-palette-v2')
        relativePath = parts[parts.length - 1].replace(/^[/\\]/, '')
    }

    const fullPath = path.join(projectRoot, relativePath)

    // Security check: ensure the resolved path is within project root
    const resolvedPath = path.resolve(fullPath)
    if (!resolvedPath.startsWith(projectRoot)) {
        return NextResponse.json(
            { error: 'Access denied: path outside project directory' },
            { status: 403 }
        )
    }

    // Only allow markdown and json files
    const ext = path.extname(resolvedPath).toLowerCase()
    if (!['.md', '.json', '.txt'].includes(ext)) {
        return NextResponse.json(
            { error: 'Only .md, .json, and .txt files are allowed' },
            { status: 400 }
        )
    }

    try {
        const content = await fs.readFile(resolvedPath, 'utf-8')
        const stats = await fs.stat(resolvedPath)

        return NextResponse.json({
            content,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            path: relativePath
        })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }
        console.error('Error reading file:', error)
        return NextResponse.json(
            { error: 'Failed to read file' },
            { status: 500 }
        )
    }
}
