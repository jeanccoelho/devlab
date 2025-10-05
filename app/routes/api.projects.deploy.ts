import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createSupabaseServerClient, requireAuth } from '~/lib/supabase.server';
import type { Database } from '~/types/database';

interface DeployProjectBody {
  projectId: string;
  platform: 'netlify' | 'vercel' | 'cloudflare';
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const supabase = createSupabaseServerClient(request);

  try {
    const body: DeployProjectBody = await request.json();
    const { projectId, platform } = body;

    if (!projectId || !platform) {
      return json({ error: 'Project ID and platform are required' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: deployment, error: deploymentError } = await supabase
      .from('project_deployments')
      .insert({
        project_id: projectId,
        user_id: user.user.id,
        platform,
        status: 'pending',
      } as any)
      .select()
      .single();

    if (deploymentError) {
      throw deploymentError;
    }

    return json({
      success: true,
      deployment,
      message: `Deployment to ${platform} initiated. Please follow the deployment link.`,
    });
  } catch (error) {
    console.error('Error initiating deployment:', error);
    return json({ error: 'Failed to initiate deployment' }, { status: 500 });
  }
}

export function getDeploymentUrl(platform: string, files: any): string {
  const projectFiles = JSON.stringify(files);
  const encodedFiles = encodeURIComponent(projectFiles);

  switch (platform) {
    case 'netlify':
      return `https://app.netlify.com/start/deploy?repository=#`;
    case 'vercel':
      return `https://vercel.com/new`;
    case 'cloudflare':
      return `https://dash.cloudflare.com/`;
    default:
      return '#';
  }
}
