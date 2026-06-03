#!/usr/bin/env node
// Import des données TSV vers Supabase
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-to-supabase.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = resolve(ROOT, 'data')
const DOCS_DIR = resolve(ROOT, 'docs')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

function parseTSV(filePath) {
  const text = readFileSync(filePath, 'utf-8')
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split('\t')
  const rows = lines.slice(1).map((l) => {
    const cells = l.split('\t')
    while (cells.length < headers.length) cells.push('')
    return cells
  })
  return { headers, rows }
}

async function importTable(tsvFile, supabaseTable, metaKey) {
  console.log(`\n📥 Import ${tsvFile} → ${supabaseTable}`)
  const { headers, rows } = parseTSV(resolve(DATA_DIR, tsvFile))
  console.log(`   ${rows.length} lignes, ${headers.length} colonnes`)

  // Stocker les headers dans crm_meta
  const { error: metaErr } = await supabase.from('crm_meta').upsert({ key: metaKey, value: headers })
  if (metaErr) { console.error('   ❌ Headers:', metaErr.message); return }
  console.log('   ✅ Headers sauvegardés')

  if (rows.length === 0) { console.log('   ⏭️  Aucune donnée à importer'); return }

  // Insérer en batches de 500
  const BATCH = 500
  const idIdx = headers.indexOf('id')
  const createdIdx = headers.indexOf('created_at')
  const updatedIdx = headers.indexOf('updated_at')

  let imported = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const records = batch.map((row) => {
      const id = row[idIdx] || `row-${i}`
      const rowData = {}
      headers.forEach((h, idx) => {
        if (h !== 'id') rowData[h] = row[idx] ?? ''
      })
      return {
        id,
        row_data: rowData,
        created_at: row[createdIdx] ?? '',
        updated_at: row[updatedIdx] ?? '',
      }
    })

    const { error } = await supabase.from(supabaseTable).upsert(records, { onConflict: 'id' })
    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH}:`, error.message)
    } else {
      imported += batch.length
      process.stdout.write(`\r   📊 ${imported}/${rows.length} lignes importées...`)
    }
  }
  console.log(`\n   ✅ Import terminé`)
}

async function importMeta(fileName, key) {
  try {
    const content = readFileSync(resolve(DATA_DIR, fileName), 'utf-8')
    const value = JSON.parse(content)
    const { error } = await supabase.from('crm_meta').upsert({ key, value })
    if (error) throw error
    console.log(`✅ ${fileName} → crm_meta[${key}]`)
  } catch (e) {
    console.log(`⚠️  ${fileName} ignoré: ${e.message}`)
  }
}

async function importDoc(fileName, key) {
  try {
    const content = readFileSync(resolve(DOCS_DIR, fileName), 'utf-8')
    const { error } = await supabase.from('crm_meta').upsert({ key, value: content })
    if (error) throw error
    console.log(`✅ docs/${fileName} → crm_meta[${key}]`)
  } catch (e) {
    console.log(`⚠️  docs/${fileName} ignoré: ${e.message}`)
  }
}

async function main() {
  console.log('🚀 Import CRM → Supabase')
  console.log(`   URL: ${url}`)

  await importTable('companies.tsv', 'crm_companies', 'companies_headers')
  await importTable('contacts.tsv', 'crm_contacts', 'contacts_headers')
  await importTable('calls.tsv', 'crm_calls', 'calls_headers')

  console.log('\n📋 Import des configs JSON...')
  await importMeta('crm-views.json', 'views')
  await importMeta('crm-lists.json', 'lists')
  await importMeta('crm-audit.json', 'audit')

  console.log('\n📄 Import des docs Markdown...')
  await importDoc('crm-rules.md', 'doc_crm_rules')
  await importDoc('icp.md', 'doc_icp')

  console.log('\n🎉 Import complet !')
}

main().catch((e) => { console.error(e); process.exit(1) })
