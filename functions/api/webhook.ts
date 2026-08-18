import { handleWebhook } from '../../backend/webhook';
import { Env } from '../../backend/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleWebhook(context.request, context.env);
};


export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: true, service: 'challengawy-telegram-webhook' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
