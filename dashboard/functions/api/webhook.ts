import { handleWebhook } from '../../../src/webhook';
import { Env } from '../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleWebhook(context.request, context.env);
};
