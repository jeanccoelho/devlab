import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { useEffect, useState } from 'react';
import type { Database } from '~/types/database';

type ProjectWithOwner = Database['public']['Functions']['get_project_by_share_token']['Returns'][number];

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || !data.project) {
    return [{ title: 'Project Not Found | Bolt.new' }];
  }

  return [
    { title: `${data.project.name} | Bolt.new` },
    { name: 'description', content: data.project.description || 'Shared project from Bolt.new' },
  ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { token } = params;

  if (!token) {
    throw new Response('Token is required', { status: 400 });
  }

  const supabase = createSupabaseServerClient(request);

  const { data, error } = await (supabase.rpc as any)('get_project_by_share_token', {
    p_share_token: token,
  });

  if (error || !data || (data as ProjectWithOwner[]).length === 0) {
    throw new Response('Project not found', { status: 404 });
  }

  const project = (data as ProjectWithOwner[])[0];

  await (supabase.rpc as any)('increment_project_views', {
    p_project_id: project.id,
  });

  return json({ project });
}

export default function SharedProject() {
  const { project } = useLoaderData<typeof loader>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  const files = (project as ProjectWithOwner).files as Record<string, { content?: string }>;
  const fileList = Object.keys(files);

  useEffect(() => {
    if (fileList.length > 0 && !selectedFile) {
      const firstFile = fileList[0];
      setSelectedFile(firstFile);
      setFileContent(files[firstFile]?.content || '');
    }
  }, [fileList, selectedFile, files]);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    setFileContent(files[filePath]?.content || '');
  };

  return (
    <div className="flex flex-col h-screen bg-bolt-elements-background-depth-1">
      <header className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-semibold text-accent">
            <span className="i-bolt:logo-text?mask w-[46px] inline-block" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-bolt-elements-textPrimary">{project.name}</h1>
            <p className="text-sm text-bolt-elements-textSecondary">
              by {project.owner_name} · {project.view_count} views · {project.fork_count} forks
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ClientOnly>
            {() => (
              <>
                <button
                  className="px-4 py-2 rounded-lg bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
                  onClick={() => {
                    console.log('Fork project');
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="i-ph:git-fork text-lg" />
                    Fork
                  </div>
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors"
                >
                  Sign In to Edit
                </Link>
              </>
            )}
          </ClientOnly>
        </div>
      </header>

      {project.description && (
        <div className="p-4 bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
          <p className="text-bolt-elements-textSecondary">{project.description}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-bolt-elements-textSecondary mb-2">Files</h2>
            <div className="space-y-1">
              {fileList.map((filePath) => (
                <button
                  key={filePath}
                  onClick={() => handleFileSelect(filePath)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedFile === filePath
                      ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent'
                      : 'text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="i-ph:file text-base" />
                    <span className="truncate">{filePath}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          {selectedFile ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-2 bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
                <span className="text-sm text-bolt-elements-textPrimary font-mono">{selectedFile}</span>
              </div>
              <div className="flex-1 overflow-auto">
                <pre className="p-4 text-sm font-mono text-bolt-elements-textPrimary">
                  <code>{fileContent}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-bolt-elements-textSecondary">
              Select a file to view
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
