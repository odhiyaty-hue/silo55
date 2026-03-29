import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/app';
import { registerRoutes } from '../server/routes';

// Cache the server setup to avoid re-registering routes on every request
let isRegistered = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isRegistered) {
        await registerRoutes(app);
        isRegistered = true;
    }

    // Forward the request to Express
    app(req as any, res as any);
}
