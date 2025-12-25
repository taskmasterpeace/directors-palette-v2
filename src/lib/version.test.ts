/**
 * Tests for application version configuration
 * Ensures the version from package.json is correctly formatted
 * and can be used by the footer component
 */

import { describe, it, expect } from 'vitest'
import packageJson from '../../package.json'

// Semantic version regex: major.minor.patch with optional prerelease and build metadata
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/

describe('Application Version', () => {
    it('should have a version defined in package.json', () => {
        expect(packageJson.version).toBeDefined()
        expect(typeof packageJson.version).toBe('string')
        expect(packageJson.version.length).toBeGreaterThan(0)
    })

    it('should follow semantic versioning format', () => {
        expect(packageJson.version).toMatch(SEMVER_REGEX)
    })

    it('should format correctly when prefixed with "v" for footer display', () => {
        const displayVersion = `v${packageJson.version}`

        expect(displayVersion).toMatch(/^v\d+\.\d+\.\d+/)
        expect(displayVersion.startsWith('v')).toBe(true)
    })

    it('should match the expected current version', () => {
        // This test documents the expected version and will fail when updated
        // Update this value when incrementing the version
        expect(packageJson.version).toBe('0.95.0')
    })
})
