import { assetName, buildLatestJson, downloadUrl, missingBuildEnv } from './release-lib.mjs'

test('nome do instalador na Release não tem espaço', () => {
  expect(assetName('0.3.0')).toBe('ADB-Suite-Mobiltec_0.3.0_x64-setup.exe')
  expect(assetName('0.3.0')).not.toMatch(/\s/)
})

test('URL de download aponta pra tag da versão', () => {
  expect(downloadUrl('danielneves2/adb-suite-mobiltec', '0.3.0', 'ADB-Suite-Mobiltec_0.3.0_x64-setup.exe')).toBe(
    'https://github.com/danielneves2/adb-suite-mobiltec/releases/download/v0.3.0/ADB-Suite-Mobiltec_0.3.0_x64-setup.exe',
  )
})

test('build da versão exige a API configurada (senão o instalador sai sem sincronizar)', () => {
  expect(missingBuildEnv('﻿DATABASE_URL=x\nVERCEL_TOKEN=y\n')).toEqual(['VITE_API_URL', 'VITE_APP_KEY'])
  expect(missingBuildEnv('VITE_API_URL=https://a.vercel.app\r\nVITE_APP_KEY=\r\n')).toEqual(['VITE_APP_KEY'])
  expect(missingBuildEnv('VITE_API_URL=https://a.vercel.app\nVITE_APP_KEY=abc\n')).toEqual([])
})

test('latest.json no formato do updater do Tauri', () => {
  const json = buildLatestJson({
    version: '0.3.0',
    notes: 'Atualização automática',
    pubDate: new Date('2026-11-26T15:00:00Z'),
    signature: 'c2lnbmF0dXJh\n',
    url: 'https://x/y.exe',
  })
  expect(json).toEqual({
    version: '0.3.0',
    notes: 'Atualização automática',
    pub_date: '2026-11-26T15:00:00.000Z',
    platforms: { 'windows-x86_64': { signature: 'c2lnbmF0dXJh', url: 'https://x/y.exe' } },
  })
})
