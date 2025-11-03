// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VoiceCommandService } from './services/VoiceCommandService';
import * as https from 'https';
import * as http from 'http';

function getBillingServerUrl(): string {
  const cfg = vscode.workspace.getConfiguration('agent8');
  const url = cfg.get<string>('billing.serverUrl') || 'http://localhost:4242';
  return url.replace(/\/$/, '');
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    lib
      .get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({});
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

async function ensureEntitled(context: vscode.ExtensionContext): Promise<boolean> {
  const entitled = await context.secrets.get('agent8_entitled');
  return entitled === 'true';
}

async function promptSignIn(context: vscode.ExtensionContext) {
  const choice = await vscode.window.showInformationMessage(
    'Agent 8 requires a subscription to use. Sign in or view plans to proceed.',
    'Sign In',
    'See Plans'
  );
  if (choice === 'Sign In') {
    await vscode.commands.executeCommand('agent-8.signIn');
  } else if (choice === 'See Plans') {
    const url = vscode.Uri.parse(getBillingServerUrl() + '/');
    vscode.env.openExternal(url);
  }
}

async function signInFlow(context: vscode.ExtensionContext) {
  const mode = await vscode.window.showQuickPick(['Subscriber', 'Owner'], { placeHolder: 'Choose sign-in type' });
  if (!mode) return;
  if (mode === 'Owner') {
    const code = await vscode.window.showInputBox({ prompt: 'Enter owner access code', password: true });
    if (!code) return;
    try {
      // POST owner-login
      const url = getBillingServerUrl() + '/owner-login';
      const res = await new Promise<any>((resolve, reject) => {
        const data = JSON.stringify({ code });
        const u = new URL(url);
        const lib = u.protocol === 'https:' ? https : http;
        const req = lib.request(
          {
            hostname: u.hostname,
            port: u.port ? Number(u.port) : (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          },
          (resp) => {
            let body = '';
            resp.on('data', (c) => (body += c));
            resp.on('end', () => {
              try { resolve(JSON.parse(body)); } catch { resolve({}); }
            });
          }
        );
        req.on('error', reject);
        req.write(data);
        req.end();
      });
      if (res && res.access) {
        await context.secrets.store('agent8_entitled', 'true');
        await context.secrets.store('agent8_owner_token', String(res.token || ''));
        vscode.window.showInformationMessage('Owner access granted. Agent 8 is now enabled.');
      } else {
        vscode.window.showErrorMessage('Invalid owner code.');
      }
    } catch (e) {
      vscode.window.showErrorMessage('Owner sign-in failed: ' + String(e));
    }
    return;
  }

  // Subscriber: check entitlement by email
  const email = await vscode.window.showInputBox({ prompt: 'Enter your email used at checkout' });
  if (!email) return;
  try {
    const url = getBillingServerUrl() + '/entitlement?email=' + encodeURIComponent(email);
    const j = await fetchJson(url);
    if (j && j.entitled) {
      await context.secrets.store('agent8_entitled', 'true');
      await context.secrets.store('agent8_email', email);
      vscode.window.showInformationMessage('Signed in. Agent 8 is now enabled.');
    } else {
      const open = await vscode.window.showWarningMessage('No active subscription found for this email.', 'See Plans');
      if (open === 'See Plans') {
        vscode.env.openExternal(vscode.Uri.parse(getBillingServerUrl() + '/'));
      }
    }
  } catch (e) {
    vscode.window.showErrorMessage('Sign-in failed: ' + String(e));
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "agent-8" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('agent-8.helloWorld', async () => {
    if (!(await ensureEntitled(context))) {
      await promptSignIn(context);
      return;
    }
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from Agent 8!');
  });

	context.subscriptions.push(disposable);

	// Initialize voice command service
	const voiceService = new VoiceCommandService();

	// Register start voice recognition command
  const startVoiceCmd = vscode.commands.registerCommand('agent-8.startVoice', async () => {
    if (!(await ensureEntitled(context))) {
      await promptSignIn(context);
      return;
    }
    await voiceService.startVoiceRecognition();
  });

	// Register stop voice recognition command
  const stopVoiceCmd = vscode.commands.registerCommand('agent-8.stopVoice', async () => {
    if (!(await ensureEntitled(context))) {
      await promptSignIn(context);
      return;
    }
    voiceService.stopVoiceRecognition();
  });

  // Sign In command
  const signInCmd = vscode.commands.registerCommand('agent-8.signIn', async () => {
    await signInFlow(context);
  });

  // Prompt at startup if not entitled
  setTimeout(async () => {
    if (!(await ensureEntitled(context))) {
      await promptSignIn(context);
    }
  }, 500);

  context.subscriptions.push(startVoiceCmd, stopVoiceCmd, signInCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}
