import * as vscode from 'vscode';
import {
  SSOClient,
  RoleInfo,
  paginateListAccountRoles,
  AccountInfo,
  paginateListAccounts,
} from '@aws-sdk/client-sso';
import * as fs from 'fs/promises';
import ini from 'ini';

import { AwsConnection } from './awsToolkitVscode';
import { getPreferredRole, resolveAwsConfigPath } from './configuration';
import { omitNullish } from './utils';
import { fromSso as getSsoTokenProvider } from '@aws-sdk/token-providers';

export interface Profile extends AccountInfo {
  readonly roleName?: string;
  readonly profileName?: string;
}

export interface ConnectionConfig extends AwsConnection {
  readonly profiles: Profile[];
}

export async function listSSOAccountRoles(
  client: SSOClient,
  accessToken: string,
  accountId: string,
): Promise<RoleInfo[]> {
  const paginator = paginateListAccountRoles(
    { client },
    { accessToken: accessToken, accountId: accountId },
  );

  const roles: RoleInfo[] = [];
  for await (const page of paginator) {
    roles.push(...page.roleList!);
  }

  return roles;
}

export async function listSSOAccounts(
  client: SSOClient,
  accessToken: string,
): Promise<AccountInfo[]> {
  const paginator = paginateListAccounts(
    { client },
    { accessToken: accessToken },
  );

  const accounts: AccountInfo[] = [];
  for await (const page of paginator) {
    accounts.push(...page.accountList!);
  }

  return accounts;
}

export async function writeAwsConfig(
  connConfigs: ConnectionConfig[],
): Promise<string> {
  const config: Record<string, Record<string, string | undefined>> = {};
  const configContent: string[] = [];

  for (const connConf of connConfigs) {
    if (connConf.type !== 'sso') {
      throw new Error('Only SSO profiles are currently supported');
    }

    config[`sso-session ${connConf.id}`] = {
      sso_start_url: connConf.startUrl,
      sso_region: connConf.ssoRegion,
      sso_registration_scopes: connConf.scopes!.join(' '),
    };

    for (const profile of connConf.profiles) {
      config[`profile ${profile.profileName!}`] = omitNullish({
        sso_session: connConf.id,
        sso_account_id: profile.accountId,
        sso_role_name: profile.roleName,
        region: connConf.ssoRegion,
      });
    }
    configContent.push(
      `# --> ${connConf.label}\n`,
      ini.stringify(config, {
        whitespace: true,
        align: true,
      }),
      `# <-- ${connConf.label}\n`,
      '\n',
    );
  }

  const configPath = await resolveAwsConfigPath();
  await fs.writeFile(configPath, configContent.join(''), {
    mode: 0o600,
    flag: 'w+',
  });

  return configPath;
}

async function getOrRefreshOrRequestSSOToken(conn: AwsConnection) {
  // Unfortunately, we need to create a dummy configuration, since
  // the SDK does not offer another option to configure the token provider
  const dummy = 'dummy';
  const configPath = await writeAwsConfig([
    {
      ...conn,
      profiles: [
        {
          profileName: dummy,
        },
      ],
    },
  ]);

  const tokenProvider = getSsoTokenProvider({
    profile: dummy,
    filepath: '/dev/null',
    configFilepath: configPath,
    ignoreCache: true,
  });

  try {
    return await tokenProvider();
  } catch (error) {}

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Reauthenticating in AWS toolkit...',
      cancellable: false,
    },
    (_progress, _token) =>
      vscode.commands.executeCommand('aws.toolkit.auth.switchConnections'),
  );

  try {
    return await tokenProvider();
  } catch (error) {
    throw new Error(
      'Unable to get SSO token provider - AWS toolkit is likely not authenticated. Please check the configuration there.',
    );
  }
}

export async function getSSOProfiles(conn: AwsConnection): Promise<Profile[]> {
  if (conn.type !== 'sso') {
    throw new Error('Only connections with SSO are supported with this method');
  }

  const token = await getOrRefreshOrRequestSSOToken(conn);
  const client = new SSOClient({ region: conn.ssoRegion });
  const accounts = await listSSOAccounts(client, token.token);
  const preferredRole = getPreferredRole();

  const profiles: Profile[] = [];
  for (const account of accounts) {
    if (!account.accountId || !account.accountName) {
      continue;
    }

    const roles = await listSSOAccountRoles(
      client,
      token.token,
      account.accountId,
    );

    for (const role of roles) {
      const profileName =
        role.roleName === preferredRole
          ? account.accountName
          : `${account.accountName}-${role.roleName}`;

      profiles.push({
        ...account,
        profileName: profileName,
        roleName: role.roleName,
      });
    }
  }

  return profiles;
}
