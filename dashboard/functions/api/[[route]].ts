import { handleApiRoutes } from '../../backend/api/routes';
import { Env } from '../../backend/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  const apiResponse = await handleApiRoutes(context.request, context.env);
  if (apiResponse) {
    return apiResponse;
  }
  return new Response('API Route Not Found', { status: 404 });
};
