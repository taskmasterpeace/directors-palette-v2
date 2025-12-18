import { test, expect } from '@playwright/test'

/**
 * API Key Tests
 * Tests API authentication, key validation, and endpoint security
 */
test.describe('API Key Authentication', () => {
    // Use environment variable or default to playwright config port
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3007'

    test.describe('Image Generation API', () => {
        test('rejects requests without API key', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
                data: { prompt: 'test image' }
            })

            expect(response.status()).toBe(401)
            const body = await response.json()
            expect(body.success).toBe(false)
            expect(body.error).toContain('Missing API key')
        })

        test('rejects requests with invalid API key', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
                headers: {
                    'Authorization': 'Bearer dp_invalid_test_key_12345'
                },
                data: { prompt: 'test image' }
            })

            expect(response.status()).toBe(401)
            const body = await response.json()
            expect(body.success).toBe(false)
            expect(body.error).toContain('Invalid or expired API key')
        })

        test('rejects malformed authorization header', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
                headers: {
                    'Authorization': 'Basic abc123' // Wrong auth type
                },
                data: { prompt: 'test image' }
            })

            expect(response.status()).toBe(401)
        })
    })

    test.describe('Recipe Execution API', () => {
        test('rejects requests without API key', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/v1/recipes/execute`, {
                data: {
                    template: 'Test <<SUBJECT:text>>',
                    variables: { SUBJECT: 'mountain' }
                }
            })

            expect(response.status()).toBe(401)
            const body = await response.json()
            expect(body.error).toContain('Missing API key')
        })

        test('rejects requests with invalid API key', async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/v1/recipes/execute`, {
                headers: {
                    'Authorization': 'Bearer dp_fake_key_99999'
                },
                data: {
                    template: 'Test <<SUBJECT:text>>',
                    variables: { SUBJECT: 'mountain' }
                }
            })

            expect(response.status()).toBe(401)
            const body = await response.json()
            expect(body.error).toContain('Invalid or expired API key')
        })
    })

    test.describe('Usage API', () => {
        test('rejects unauthenticated requests', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/v1/usage`)

            expect(response.status()).toBe(401)
            const body = await response.json()
            expect(body.error).toBe('Unauthorized')
        })
    })

    test.describe('Recipe List API (Public)', () => {
        test('allows unauthenticated access to recipe list', async ({ request }) => {
            const response = await request.get(`${BASE_URL}/api/v1/recipes`)

            // This endpoint should be public
            expect(response.status()).toBe(200)
            const body = await response.json()
            expect(body.success).toBe(true)
            expect(Array.isArray(body.recipes)).toBe(true)
        })
    })
})

test.describe('API Key Format Validation', () => {
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3007'

    test('only accepts keys with dp_ prefix', async ({ request }) => {
        // Test without dp_ prefix
        const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
            headers: {
                'Authorization': 'Bearer abc123_no_prefix'
            },
            data: { prompt: 'test' }
        })

        expect(response.status()).toBe(401)
    })

    test('handles empty authorization header', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
            headers: {
                'Authorization': ''
            },
            data: { prompt: 'test' }
        })

        expect(response.status()).toBe(401)
    })

    test('supports direct key format (without Bearer)', async ({ request }) => {
        // Some APIs accept just the key without "Bearer" prefix
        const response = await request.post(`${BASE_URL}/api/v1/images/generate`, {
            headers: {
                'Authorization': 'dp_test_direct_format'
            },
            data: { prompt: 'test' }
        })

        // Should still validate the key (will fail because it's invalid, not because of format)
        expect(response.status()).toBe(401)
        const body = await response.json()
        expect(body.error).toContain('Invalid or expired API key')
    })
})
