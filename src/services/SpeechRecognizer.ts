import * as vscode from 'vscode';

/**
 * SpeechRecognizer is a simple placeholder abstraction for a speech recognition engine.
 * In a real implementation, wire this up to a cloud service (Azure, OpenAI, etc.) or
 * a local recognizer and return the recognized transcript.
 */
export class SpeechRecognizer {
  private recognizing = false;

  public async startRecognition(): Promise<string> {
    this.recognizing = true;
    // TODO: Integrate with a real speech recognition provider.
    // For now, show a hint and return a sample transcript.
    vscode.window.showInformationMessage('Agent 8: Using stubbed speech recognizer.');
    // Example transcript the generator can parse
    return Promise.resolve(
      'Create a function called add with parameters a and b and return number'
    );
  }

  public stopRecognition(): void {
    this.recognizing = false;
  }

  public get isRecognizing(): boolean {
    return this.recognizing;
  }
}