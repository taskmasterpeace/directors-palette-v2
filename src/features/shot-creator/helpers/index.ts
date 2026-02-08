/**
 * Shot Creator Helpers
 */

export * from './prompt-syntax-feedback'

/**
 * Safely convert unknown error to Error object
 */
export function toError(error: unknown): Error {
    if (error instanceof Error) return error
    if (typeof error === 'string') return new Error(error)
    if (error && typeof error === 'object' && 'message' in error) {
        return new Error(String((error as { message: unknown }).message))
    }
    return new Error(String(error))
}

export function extractAtTags(text: string): string[] {
    const matches = text.match(/@\w+/g);
    return matches || [];
}

export async function urlToFile(url: string, filename: string): Promise<File> {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided')
    }
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

export const dataURLtoFile = (dataurl: string, filename: string): File => {
    if (!dataurl || !dataurl.includes(',')) {
        throw new Error('Invalid data URL format')
    }
    const arr = dataurl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
}