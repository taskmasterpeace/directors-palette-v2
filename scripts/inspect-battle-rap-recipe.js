#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data, error } = await supabase
    .from('user_recipes')
    .select('*')
    .eq('id', '16c2b9cc-ff46-4f0c-a251-8c4d2aac1101')
    .single()
  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log('id:', data.id)
  console.log('name:', data.name)
  console.log('is_system:', data.is_system)
  console.log('user_id:', data.user_id)
  console.log('updated_at:', data.updated_at)
  console.log('\n--- template ---\n')
  const stages = data.stages || []
  stages.forEach((s, i) => {
    console.log(`[stage ${i}]`)
    console.log(s.template)
    console.log('\n')
  })
}
main()
