import { createElastic, indexName } from './clients.js';
let client: ReturnType<typeof createElastic> | undefined;
export function getElastic() { return client ??= createElastic(); }
export { indexName };
