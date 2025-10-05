import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  url.pathname = '/favicon.svg';
  
  return Response.redirect(url.toString(), 301);
}
