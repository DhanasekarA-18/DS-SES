import { z } from 'zod';

export const NotificationTypeSchema = z.enum(['EMAIL', 'SMS', 'WHATSAPP']);

export const NotificationPayloadSchema = z.object({
  type: NotificationTypeSchema,
  template: z.string().min(1),
  to: z.string().min(1),
  data: z.record(z.string(), z.any()).optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
