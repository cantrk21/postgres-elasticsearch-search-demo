import { createDatabase } from './clients.js';
let database: ReturnType<typeof createDatabase> | undefined;
export function getDatabase() { return database ??= createDatabase(); }
