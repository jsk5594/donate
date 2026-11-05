// Node 22.13+ 내장 node:sqlite 최소 타입 (@types/node 20에는 없음)
declare module "node:sqlite" {
  type Value = string | number | bigint | null | Uint8Array;
  export class StatementSync {
    all(...params: Value[]): Record<string, Value>[];
    get(...params: Value[]): Record<string, Value> | undefined;
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean; open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
