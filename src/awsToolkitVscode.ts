// taken from
// https://github.com/aws/aws-toolkit-vscode/blob/78fb3fd59bab150e4e8ed77a302e2e15c6ff62c6/packages/core/src/auth/connection.ts#L196

export interface ProfileMetadata {
  /**
   * Labels are used for anything UI related when present.
   */
  readonly label?: string;

  /**
   * Used to differentiate various edge-cases that are based off state or state transitions:
   * * `unauthenticated` -> try to login
   * * `valid` -> `invalid` -> notify that the credentials are invalid, prompt to login again
   * * `invalid` -> `invalid` -> immediately throw to stop the user from being spammed
   */
  readonly connectionState:
    | 'valid'
    | 'invalid'
    | 'unauthenticated'
    | 'authenticating';

  /**
   * Source of this connection profile where it was first created.
   */
  readonly source?: 'amazonq' | 'toolkit';
}

export interface AwsConnection {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly ssoRegion: string;
  readonly startUrl: string;
  readonly scopes?: string[];
  readonly state: ProfileMetadata['connectionState'];
}

// based on
// https://github.com/aws/aws-toolkit-vscode/blob/78fb3fd59bab150e4e8ed77a302e2e15c6ff62c6/packages/toolkit/src/api.ts#L16

export interface AwsToolkitVscodeToolkitApi {
  /**
   * Exposing listConnections API for other extension to read or re-use
   * the available connections in aws toolkit.
   */
  listConnections(): Promise<AwsConnection[]>;

  /**
   * Exposing setConnection API for other extension to push its connection state to aws toolkit
   * @param connection The AWS connection of the source extension that is intended to be shared with toolkit
   */
  setConnection(connection: AwsConnection): Promise<void>;

  /**
   * Declares a connection to toolkit to re-use SSO SSO metadata (e.g. region, startURL),
   * but the connection is not re-used directly. These do not persist across restarts.
   * @param connection The AWS connection of the source extension that is intended to be shared with toolkit
   */
  declareConnection(
    conn: Pick<AwsConnection, 'startUrl' | 'ssoRegion'>,
    source: string,
  ): void;

  /**
   * Undeclares a connection (e.g. logged out in the API caller). This will remove the
   * connection's parameters (startURL, region) from the list of available logins.
   * @param connId The connection id of a declared connection.
   */
  undeclareConnection(conn: Pick<AwsConnection, 'startUrl'>): void;

  /**
   * Exposing deleteConnection API for other extension to push connection deletion event to AWS toolkit
   * @param id The connection id of the to be deleted connection in aws toolkit
   */
  deleteConnection(id: string): Promise<void>;

  /**
   * Exposing onDidChangeConnection API for other extension to know when aws toolkit connection changed
   * @param onConnectionStateChange The callback that toolkit invokes when toolkit connection state changes
   * @param onConnectionDeletion The callback that toolkit invokes when toolkit connection is deleted.
   */
  onDidChangeConnection(
    onConnectionStateChange: (c: AwsConnection) => Promise<void>,
    onConnectionDeletion: (id: string) => Promise<void>,
  ): Promise<void>;
}

// simplified from
// https://github.com/aws/aws-toolkit-vscode/blob/78fb3fd59bab150e4e8ed77a302e2e15c6ff62c6/packages/core/src/amazonq/extApi.ts#L17
export interface AwsToolkitVscodeAmazonQApi {
  authApi: {
    reauthIfNeeded(): Promise<void>;
  };
}
