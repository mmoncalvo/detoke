import request from 'supertest';
import { createApp } from '../server/app.js';

export const app = createApp();
export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
export { request };
