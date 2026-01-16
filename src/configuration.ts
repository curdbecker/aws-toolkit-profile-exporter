import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { EXTENSION_ID, extensionScopedId } from './utils';

const ISOLATED_PATH = path.join(
  os.homedir(),
  '.aws',
  'config.aws-toolkit-profile-exporter',
);

const extensionCfg = vscode.workspace.getConfiguration(EXTENSION_ID);

export type ConfigLocation = 'isolated' | 'custom' | 'global';

export function getPreferredRole(): string {
  return extensionCfg.get<string>('preferredRole')!;
}

export function shallAutoRegenerateConfig(): boolean {
  return extensionCfg.get<boolean>('autoRegenerate')!;
}

export function exportOnLaunch(): boolean {
  return extensionCfg.get<boolean>('exportOnLaunch')!;
}

export async function resolveAwsConfigPath(): Promise<string> {
  const location = extensionCfg.get<ConfigLocation>(
    'configLocation',
    'isolated',
  );
  const isDevContainer =
    process.env.REMOTE_CONTAINERS === 'true' ||
    vscode.env.remoteName === 'dev-container';

  if (location === 'global') {
    if (!isDevContainer) {
      const response = await vscode.window.showWarningMessage(
        'This will overwrite the global AWS configuration file in your global home directory, since you do not appear to be in a devcontainer. Are you really sure?',
        'yes',
        'no',
      );
      if (response !== 'yes') {
        throw new Error(
          'Export was aborted, since the AWS configuration file should be left untouched',
        );
      }
    }

    return path.join(os.homedir(), '.aws', 'config');
  }

  if (location === 'custom') {
    const custom = extensionCfg.get<string>('customConfigPath');
    if (!custom) {
      throw new Error(
        `${extensionScopedId('customConfigPath')} must be set when configLocation is "custom".`,
      );
    }
    return custom;
  }

  // default: extension-managed
  return ISOLATED_PATH;
}
