import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

export interface ConvertedModel {
  obj: Buffer
  mtl: Buffer
  texture: Buffer | null
}

/**
 * Download a GLB file from a URL and return as Buffer
 */
async function downloadGlb(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Convert a GLB to OBJ + MTL + texture, optionally scaling and simplifying.
 *
 * @param glbUrl - URL to the GLB file (Supabase Storage permanent URL)
 * @param scaleMm - Target bounding box size in mm (50 or 100). If null, keep original scale.
 * @param targetTriangles - Target triangle count for simplification (default 125000)
 */
export async function convertToObj(
  glbUrl: string,
  scaleMm: number | null = null,
  targetTriangles: number = 125000,
): Promise<ConvertedModel> {
  await MeshoptSimplifier.ready

  const glbBuffer = await downloadGlb(glbUrl)

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const document = await io.readBinary(new Uint8Array(glbBuffer))
  const root = document.getRoot()

  // Weld vertices before simplification
  await document.transform(weld())

  // Count current triangles
  let totalTriangles = 0
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      if (indices) {
        totalTriangles += indices.getCount() / 3
      }
    }
  }

  // Simplify if over target
  if (totalTriangles > targetTriangles) {
    const ratio = targetTriangles / totalTriangles
    await document.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 })
    )
  }

  // Scale if requested
  if (scaleMm !== null) {
    const scene = root.listScenes()[0]
    if (scene) {
      // Find bounding box of all meshes
      let minX = Infinity, minY = Infinity, minZ = Infinity
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

      for (const mesh of root.listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const position = prim.getAttribute('POSITION')
          if (!position) continue
          for (let i = 0; i < position.getCount(); i++) {
            const [x, y, z] = position.getElement(i, [0, 0, 0])
            minX = Math.min(minX, x); maxX = Math.max(maxX, x)
            minY = Math.min(minY, y); maxY = Math.max(maxY, y)
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z)
          }
        }
      }

      const currentSizeM = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
      if (currentSizeM > 0) {
        const targetSizeM = scaleMm / 1000 // mm to meters
        const scaleFactor = targetSizeM / currentSizeM

        // Scale all mesh positions
        for (const mesh of root.listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            const position = prim.getAttribute('POSITION')
            if (!position) continue
            for (let i = 0; i < position.getCount(); i++) {
              const coords = position.getElement(i, [0, 0, 0])
              position.setElement(i, [
                coords[0] * scaleFactor,
                coords[1] * scaleFactor,
                coords[2] * scaleFactor,
              ])
            }
          }
        }
      }
    }
  }

  // Extract texture from first material
  let textureBuffer: Buffer | null = null
  const materials = root.listMaterials()
  if (materials.length > 0) {
    const baseColorTexture = materials[0].getBaseColorTexture()
    if (baseColorTexture) {
      const imageData = baseColorTexture.getImage()
      if (imageData) {
        textureBuffer = Buffer.from(imageData)
      }
    }
  }

  // Export to OBJ manually (gltf-transform doesn't have OBJ export, so we build it)
  const objLines: string[] = ['# Figurine OBJ Export', '# Units: millimeters']
  const mtlLines: string[] = ['# Figurine MTL']

  if (textureBuffer) {
    mtlLines.push('newmtl figurine_material')
    mtlLines.push('Ka 1.0 1.0 1.0')
    mtlLines.push('Kd 1.0 1.0 1.0')
    mtlLines.push('Ks 0.0 0.0 0.0')
    mtlLines.push('d 1.0')
    mtlLines.push('map_Kd texture.png')
    objLines.push('mtllib figurine.mtl')
    objLines.push('usemtl figurine_material')
  }

  let vertexOffset = 0
  let texCoordOffset = 0

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION')
      const texcoord = prim.getAttribute('TEXCOORD_0')
      const normal = prim.getAttribute('NORMAL')
      const indices = prim.getIndices()

      if (!position) continue

      // Write vertices
      for (let i = 0; i < position.getCount(); i++) {
        const [x, y, z] = position.getElement(i, [0, 0, 0])
        objLines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`)
      }

      // Write texture coordinates
      if (texcoord) {
        for (let i = 0; i < texcoord.getCount(); i++) {
          const [u, v] = texcoord.getElement(i, [0, 0])
          objLines.push(`vt ${u.toFixed(6)} ${v.toFixed(6)}`)
        }
      }

      // Write normals
      if (normal) {
        for (let i = 0; i < normal.getCount(); i++) {
          const [nx, ny, nz] = normal.getElement(i, [0, 0, 0])
          objLines.push(`vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`)
        }
      }

      // Write faces
      if (indices) {
        for (let i = 0; i < indices.getCount(); i += 3) {
          const a = indices.getScalar(i) + 1 + vertexOffset
          const b = indices.getScalar(i + 1) + 1 + vertexOffset
          const c = indices.getScalar(i + 2) + 1 + vertexOffset

          if (texcoord && normal) {
            const ta = indices.getScalar(i) + 1 + texCoordOffset
            const tb = indices.getScalar(i + 1) + 1 + texCoordOffset
            const tc = indices.getScalar(i + 2) + 1 + texCoordOffset
            objLines.push(`f ${a}/${ta}/${a} ${b}/${tb}/${b} ${c}/${tc}/${c}`)
          } else if (texcoord) {
            const ta = indices.getScalar(i) + 1 + texCoordOffset
            const tb = indices.getScalar(i + 1) + 1 + texCoordOffset
            const tc = indices.getScalar(i + 2) + 1 + texCoordOffset
            objLines.push(`f ${a}/${ta} ${b}/${tb} ${c}/${tc}`)
          } else {
            objLines.push(`f ${a} ${b} ${c}`)
          }
        }
      }

      vertexOffset += position.getCount()
      if (texcoord) texCoordOffset += texcoord.getCount()
    }
  }

  return {
    obj: Buffer.from(objLines.join('\n')),
    mtl: Buffer.from(mtlLines.join('\n')),
    texture: textureBuffer,
  }
}
