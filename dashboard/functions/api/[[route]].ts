import { handleApiRoutes } from '../../../src/api/routes';
import { Env } from '../../../src/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  const apiResponse = await handleApiRoutes(context.request, context.env);
  if (apiResponse) {
    return apiResponse;
  }
  return new Response('API Route Not Found', { status: 404 });
};
