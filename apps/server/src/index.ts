import { createBattleServer } from './server';

const server = createBattleServer({ clientUrl: process.env.CLIENT_URL });
const port = Number(process.env.PORT ?? 3001);
server.http.listen(port, '0.0.0.0', () => console.log(`Core Battle server listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void server.close().then(() => process.exit(0)); });
