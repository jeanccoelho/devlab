import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createSupabaseServerClient, requireAuth } from '~/lib/supabase.server';
import type { Database } from '~/types/database';

interface SaveProjectBody {
  projectId?: string;
  name: string;
  description?: string;
  files: any;
  isPublic?: boolean;
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const supabase = createSupabaseServerClient(request);

  try {
    const body: SaveProjectBody = await request.json();
    const { projectId, name, description, files, isPublic } = body;

    if (!name || !files) {
      return json({ error: 'Name and files are required' }, { status: 400 });
    }

    if (projectId) {
      const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingProject) {
        const updateData: Database['public']['Tables']['projects']['Update'] = {
          name,
          description: description || null,
          files,
          is_public: isPublic !== undefined ? isPublic : false,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', projectId)
          .eq('user_id', user.user.id)
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        return json({ success: true, project: data });
      }
    }

    const insertData: Database['public']['Tables']['projects']['Insert'] = {
      user_id: user.user.id,
      name,
      description: description || null,
      files,
      is_public: isPublic !== undefined ? isPublic : false,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return json({ success: true, project: data });
  } catch (error) {
    console.error('Error saving project:', error);
    return json({ error: 'Failed to save project' }, { status: 500 });
  }
}
