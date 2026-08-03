import { handleWebhook } from '../../backend/webhook';
import { Env } from '../../backend/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleWebhook(context.request, context.env);
};
