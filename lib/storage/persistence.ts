import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
export const dbFilePath = path.join(dataDir, 'trader-notes.sqlite');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

let writeChain: Promise<void> = Promise.resolve();

export function readDbFile(): Uint8Array | null {
  if (!existsSync(dbFilePath)) return null;
  const file = readFileSync(dbFilePath);
  return new Uint8Array(file);
}

export function queueWriteDbFile(data: Uint8Array): Promise<void> {
  writeChain = writeChain.then(() => {
    writeFileSync(dbFilePath, Buffer.from(data));
  });
  return writeChain;
}
