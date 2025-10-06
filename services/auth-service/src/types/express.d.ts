import { Session } from 'express-session';

declare global {
    namespace Express {
        interface Request {
            session?: Session & {
                id?: string;
                userId?: string;
                [key: string]: any;
            };
            user?: {
                id: string;
                sub: string;
                email: string;
                sessionId?: string;
                [key: string]: any;
            };
        }
    }
}