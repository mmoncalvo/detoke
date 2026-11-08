// Socket.IO on the same HTTP server as the API. Clients authenticate in the handshake
// with the same JWT as the API; rooms limit who receives each event.
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import type { Order as OrderDTO } from '../../shared/orders.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/realtime.js';
import { config } from '../config.js';
import { Business, Order, User } from '../models/index.js';

interface SocketData {
  userId: string | null;
}

let io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

const businessRoom = (id: string) => `business:${id}`;
const orderRoom = (code: string) => `order:${code}`;

export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: config.isProduction ? config.corsOrigins : true } });

  // The token is optional: anyone may follow an order by code, only owners join their business.
  io.use((socket, next) => {
    socket.data.userId = null;
    const token = socket.handshake.auth?.token;
    if (typeof token === 'string' && token) {
      try {
        socket.data.userId = (jwt.verify(token, config.jwtSecret) as { id: string }).id;
      } catch {
        return next(new Error('Tu sesión venció, iniciá sesión de nuevo'));
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.on('business:join', async (businessId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const user = socket.data.userId ? await User.findByPk(socket.data.userId) : null;
      const business = typeof businessId === 'string' ? await Business.findByPk(businessId) : null;
      if (!user || !business || (business.ownerId !== user.id && user.role !== 'admin')) return reply({ ok: false, error: 'No tenés permiso para ver estos pedidos' });
      await socket.join(businessRoom(business.id));
      reply({ ok: true });
    });

    socket.on('order:join', async (code, ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const order = typeof code === 'string' ? await Order.findOne({ where: { publicCode: code }, attributes: ['id'] }) : null;
      if (!order) return reply({ ok: false, error: 'No encontramos ese pedido' });
      await socket.join(orderRoom(code));
      reply({ ok: true });
    });

    socket.on('order:leave', (code) => {
      if (typeof code === 'string') void socket.leave(orderRoom(code));
    });
  });

  return io;
}

export function emitOrderCreated(order: OrderDTO) {
  io?.to(businessRoom(order.businessId)).emit('order:created', order);
}

export function emitOrderUpdated(order: OrderDTO) {
  io?.to([businessRoom(order.businessId), orderRoom(order.publicCode)]).emit('order:updated', order);
}

export function emitBusinessStatus(business: { id: string; isActive: boolean; disabledAt: Date | null; disabledReason: string | null }) {
  io?.to(businessRoom(business.id)).emit('business:status', {
    businessId: business.id,
    isActive: business.isActive,
    disabledAt: business.disabledAt?.toISOString() ?? null,
    disabledReason: business.disabledReason,
  });
}

export function closeRealtime() {
  return new Promise<void>((resolve) => (io ? io.close(() => resolve()) : resolve()));
}
