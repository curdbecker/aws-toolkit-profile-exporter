import * as vscode from 'vscode';

import { ConnectionConfig, getSSOProfiles, writeAwsConfig } from './sso';
import { AwsConnection, AwsToolkitVscodeToolkitApi } from './awsToolkitVscode';
import { extensionScopedId } from './utils';
import { exportOnLaunch, shallAutoRegenerateConfig } from './configuration';

const awsToolkit = vscode.extensions.getExtension(
  'amazonwebservices.aws-toolkit-vscode',
)!.exports;

async function exportConnectionsFromToolkit(
  api: AwsToolkitVscodeToolkitApi,
): Promise<string | undefined> {
  const connections: AwsConnection[] = await api.listConnections();

  if (connections.length === 0) {
    vscode.window.showWarningMessage('No AWS Toolkit connections found');
    return undefined;
  }

  const connectionConfigs: ConnectionConfig[] = [];
  for (const conn of connections) {
    const connConf = {
      ...conn,
      profiles: await getSSOProfiles(conn),
    };
    connectionConfigs.push(connConf);

    vscode.window.showInformationMessage(
      `Found ${connConf.profiles.length} profiles for AWS Toolkit connection "${conn.label}"`,
    );
  }

  const configPath = await writeAwsConfig(connectionConfigs);
  vscode.window.showInformationMessage(
    `Exported ${connections.length} AWS Toolkit connection(s) to "${configPath}"`,
  );

  return configPath;
}

async function exportConfig(context: vscode.ExtensionContext) {
  try {
    const api: AwsToolkitVscodeToolkitApi = awsToolkit.getApi(
      context.extension.id,
    );

    const configPath = await exportConnectionsFromToolkit(api);
    if (configPath === undefined) {
      return;
    }

    context.environmentVariableCollection.replace(
      'AWS_CONFIG_FILE',
      configPath,
    );

    if (shallAutoRegenerateConfig()) {
      vscode.window.showInformationMessage(
        'Registering connection update handler to allow automatic configuration regeneration',
      );

      await api.onDidChangeConnection(
        async (conn: AwsConnection) => {
          vscode.window.showInformationMessage(
            `Connection "${conn.label}" changed its state => regenerating config`,
          );
          await exportConnectionsFromToolkit(api);
        },
        async (id: string) => {
          vscode.window.showWarningMessage(
            `Connection with id "${id}" was deleted => regenerating config`,
          );
          await exportConnectionsFromToolkit(api);
        },
      );
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message ?? String(err));
  }
}

export async function activate(context: vscode.ExtensionContext) {
  if (exportOnLaunch()) {
    await exportConfig(context);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(extensionScopedId('exportConfig'), () =>
      exportConfig(context),
    ),
  );
}
