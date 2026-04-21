#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const { data, error } = await supabase
    .from('user_recipes')
    .select('*')
    .eq('id', 'bcbf180a-56e5-451b-b8a7-93cce0149758')
    .single()
  if (error) { console.error(error); process.exit(1) }
  console.log('name:', data.name)
  console.log('description:', data.description)
  console.log('recipe_note:', data.recipe_note)
  console.log('stages count:', data.stages?.length)
  console.log('')
  for (const stage of data.stages || []) {
    console.log('--- stage', stage.id, 'order', stage.order, '---')
    console.log('TEMPLATE:')
    console.log(stage.template)
    console.log('\nFIELDS:', JSON.stringify(stage.fields, null, 2))
    console.log('REFS count:', stage.referenceImages?.length || 0)
  }
}
main()
