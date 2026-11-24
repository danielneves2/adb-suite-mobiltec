// Fronteira com o Rust: wrappers finos de invoke/listen, sem lógica.
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { DeviceInfo } from './appLogic'
import type { Step } from './commandBuilder'

export interface StepOut {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  savedTo: string | null
}

export interface StreamOutputEvent {
  runId: string
  lines: string[]
}

export interface StreamEndEvent {
  runId: string
  exitCode: number
  savedTo: string | null
  error: string | null
}

export const adb = {
  adbVersion: () => invoke<string>('adb_version'),
  listDevices: () => invoke<DeviceInfo[]>('list_devices'),
  restartAdbServer: () => invoke<void>('restart_adb_server'),
  listPackages: (serial: string) => invoke<string[]>('list_packages', { serial }),
  runSteps: (runId: string, steps: Step[], deviceDir: string | null) => invoke<StepOut[]>('run_steps', { runId, steps, deviceDir }),
  cancelRun: (runId: string) => invoke<void>('cancel_run', { runId }),
  startStream: (runId: string, step: Step, deviceDir: string | null) => invoke<void>('start_stream', { runId, step, deviceDir }),
  stopStream: (runId: string, stopStep: Step | null, afterStep: Step | null) =>
    invoke<StepOut | null>('stop_stream', { runId, stopStep, afterStep }),
  onStreamOutput: (cb: (e: StreamOutputEvent) => void): Promise<UnlistenFn> => listen<StreamOutputEvent>('stream-output', (e) => cb(e.payload)),
  onStreamEnd: (cb: (e: StreamEndEvent) => void): Promise<UnlistenFn> => listen<StreamEndEvent>('stream-end', (e) => cb(e.payload)),
  copyImageToClipboard: (path: string) => invoke<void>('copy_image_to_clipboard', { path }),
  zipFolder: (dir: string, zipPath: string) => invoke<string>('zip_folder', { dir, zipPath }),
  writeTextFile: (path: string, contents: string) => invoke<string>('write_text_file', { path, contents }),
  openTerminal: (serial: string) => invoke<void>('open_terminal', { serial }),
}

export type AdbApi = typeof adb
