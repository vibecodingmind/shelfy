export type NotifyType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
export type NotifyChannel = 'IN_APP' | 'EMAIL' | 'SMS';
export type DeliveryAction = 'SEND' | 'SKIP';

export interface DeliveryStep {
  channel: NotifyChannel;
  action: DeliveryAction;
  reason?: string;
}

export interface NotificationProviders {
  email: 'resend' | 'smtp' | null;
  sms: 'africastalking' | 'twilio' | null;
}

export function notificationProviders(env: NodeJS.ProcessEnv = process.env): NotificationProviders {
  const email = env.RESEND_API_KEY?.trim() ? 'resend' : env.SMTP_URL?.trim() ? 'smtp' : null;
  const sms = env.AFRICASTALKING_API_KEY?.trim()
    ? 'africastalking'
    : env.TWILIO_AUTH_TOKEN?.trim()
      ? 'twilio'
      : null;
  return { email, sms };
}

export function deliveryPlan(env: NodeJS.ProcessEnv = process.env): DeliveryStep[] {
  const providers = notificationProviders(env);
  return [
    { channel: 'IN_APP', action: 'SEND' },
    providers.email
      ? { channel: 'EMAIL', action: 'SEND' }
      : { channel: 'EMAIL', action: 'SKIP', reason: 'email_not_configured' },
    providers.sms
      ? { channel: 'SMS', action: 'SEND' }
      : { channel: 'SMS', action: 'SKIP', reason: 'sms_not_configured' },
  ];
}
