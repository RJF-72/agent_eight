import * as vscode from 'vscode';

/**
 * Open‑source provider friendly SpeechRecognizer.
 * Default provider: local Whisper HTTP server (e.g., whisper.cpp or faster‑whisper).
 * It performs a single recognition call and returns the transcript.
 */
export class SpeechRecognizer {
  private recognizing = false;
  private provider: 'whisperServer';
  private serverUrl: string;

  constructor() {
    const cfg = vscode.workspace.getConfiguration('agent8.speech');
    this.provider = (cfg.get<string>('provider') as any) || 'whisperServer';
    this.serverUrl = cfg.get<string>('whisperServerUrl') || 'http://localhost:3000/transcribe';
  }

  public async startRecognition(): Promise<string> {
    this.recognizing = true;
    if (this.provider === 'whisperServer') {
      vscode.window.showInformationMessage('Agent 8: contacting local Whisper server…');
      try {
        const res = await fetch(this.serverUrl, { method: 'GET', headers: { Accept: 'application/json, text/plain' } });
        const ct = res.headers.get('content-type') || '';
        let text = '';
        if (ct.includes('application/json')) {
          const data: any = await res.json();
          text = (data.text ?? data.transcript ?? '') as string;
        } else {
          text = await res.text();
        }
        if (!text || text.trim().length === 0) {
          vscode.window.showWarningMessage('Agent 8: Whisper server returned empty transcript.');
          text = 'Create a function called add with parameters a and b and return number';
        }
        return text;
      } catch (err: any) {
        vscode.window.showWarningMessage('Agent 8: could not reach local Whisper server. Using sample transcript.');
        return 'Create a function called add with parameters a and b and return number';
      }
    }

    // Fallback sample transcript
    vscode.window.showInformationMessage('Agent 8: Using stubbed speech recognizer.');
    return 'Create a function called add with parameters a and b and return number';
  }

  public stopRecognition(): void {
    this.recognizing = false;
  }

  public get isRecognizing(): boolean {
    return this.recognizing;
  }
}