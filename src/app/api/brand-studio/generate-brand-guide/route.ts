import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { getAPIClient } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('BrandStudio')

const AD_LAB_SCRIPTS = 'D:/git/mkm/ad-lab/scripts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand_id, logo_url, company_description } = body

    if (!brand_id || !company_description) {
      return NextResponse.json(
        { error: 'brand_id and company_description are required' },
        { status: 400 }
      )
    }

    log.info('Generating brand guide', { brand_id, logo_url })

    const result = await runBrandGuideScript(logo_url, company_description)

    // Update brand with generated data
    const supabase = await getAPIClient()
    const { data, error } = await supabase
      .from('brands')
      .update({
        ...result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brand_id)
      .select()
      .single()

    if (error) {
      log.error('Failed to update brand with guide data', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Generate brand guide error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brand guide generation failed' },
      { status: 500 }
    )
  }
}

function runBrandGuideScript(
  logoUrl: string | null,
  companyDescription: string
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const args = ['generate-brand-guide.js']
    if (logoUrl) {
      args.push('--logo', logoUrl)
    }
    args.push(companyDescription)

    const child = spawn('node', args, {
      cwd: AD_LAB_SCRIPTS,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        log.error('Brand guide script failed', { code, stderr })
        reject(new Error(`Brand guide script exited with code ${code}: ${stderr}`))
        return
      }

      try {
        // The script outputs JSON to stdout
        const lines = stdout.trim().split('\n')
        const jsonLine = lines.find(l => l.startsWith('{'))
        if (!jsonLine) {
          // Try to find the brand JSON file from output
          const brandJsonMatch = stdout.match(/config\/brands\/(.+?)\.json/)
          if (brandJsonMatch) {
            const brandFile = `${AD_LAB_SCRIPTS}/../config/brands/${brandJsonMatch[1]}.json`
            const brandData = JSON.parse(readFileSync(brandFile, 'utf-8'))
            resolve(parseBrandGuideOutput(brandData))
          } else {
            resolve({})
          }
        } else {
          resolve(parseBrandGuideOutput(JSON.parse(jsonLine)))
        }
      } catch (parseError) {
        log.error('Failed to parse brand guide output', { stdout, parseError })
        resolve({})
      }
    })
  })
}

function parseBrandGuideOutput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    tagline: data.tagline || null,
    industry: data.industry || null,
    audience_json: data.audience || null,
    voice_json: data.voice || null,
    visual_identity_json: data.visual_identity || null,
    music_json: data.music || null,
    visual_style_json: data.visual_style || null,
    brand_guide_image_url: data.brand_guide_image_url || null,
  }
}
