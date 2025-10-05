import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { exportAndDownloadProject } from '~/utils/project-export';
import { Dialog } from '~/components/ui/Dialog';
import type { SaveProjectResponse, DeployProjectResponse } from '~/types/api';

interface ProjectActionsProps {
  projectId?: string;
  projectName?: string;
}

export function ProjectActions({ projectId, projectName = 'My Project' }: ProjectActionsProps) {
  const files = useStore(workbenchStore.files);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  const handleExport = async () => {
    try {
      toast.info('Preparing download...');

      await exportAndDownloadProject({
        name: projectName,
        description: 'Exported from Bolt.new',
        files,
      });

      toast.success('Project exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export project');
    }
  };

  const handleSaveProject = async (isPublic: boolean = false) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          name: projectName,
          description: 'Created with Bolt.new',
          files,
          isPublic,
        }),
      });

      const data: SaveProjectResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save project');
      }

      toast.success('Project saved successfully!');
      return data.project;
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const project = await handleSaveProject(true);

    if (project && project.share_token) {
      const url = `${window.location.origin}/share/${project.share_token}`;
      setShareUrl(url);
      setShowShareDialog(true);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleDeploy = async (platform: 'netlify' | 'vercel' | 'cloudflare') => {
    const project = await handleSaveProject(false);

    if (!project) {
      return;
    }

    try {
      const response = await fetch('/api/projects/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          platform,
        }),
      });

      const data: DeployProjectResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate deployment');
      }

      toast.success(data.message || 'Deployment initiated successfully');
      setShowDeployDialog(false);

      switch (platform) {
        case 'netlify':
          window.open('https://app.netlify.com/start/deploy', '_blank');
          break;
        case 'vercel':
          window.open('https://vercel.com/new', '_blank');
          break;
        case 'cloudflare':
          window.open('https://dash.cloudflare.com/', '_blank');
          break;
      }
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error('Failed to initiate deployment');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          title="Export as ZIP"
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors text-sm"
        >
          <div className="i-ph:download-simple" />
          Export
        </button>

        <button
          title="Share Project"
          onClick={handleShare}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="i-ph:share-network" />
          {isSaving ? 'Saving...' : 'Share'}
        </button>

        <button
          title="Deploy Project"
          onClick={() => setShowDeployDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors text-sm"
        >
          <div className="i-ph:rocket-launch" />
          Deploy
        </button>
      </div>

      <Dialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        title="Share Project"
      >
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Anyone with this link can view your project:
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary text-sm"
          />
          <button
            onClick={copyShareUrl}
            className="px-4 py-2 rounded-lg bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover transition-colors text-sm"
          >
            Copy
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowShareDialog(false)}
            className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </Dialog>

      <Dialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
        title="Deploy Project"
      >
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Choose a platform to deploy your project:
        </p>

        <div className="grid gap-3 mb-4">
          <button
            onClick={() => handleDeploy('netlify')}
            className="flex items-center gap-3 p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:border-bolt-elements-item-contentAccent transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-bolt-elements-textPrimary">Netlify</div>
              <div className="text-xs text-bolt-elements-textSecondary">Deploy to Netlify</div>
            </div>
          </button>

          <button
            onClick={() => handleDeploy('vercel')}
            className="flex items-center gap-3 p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:border-bolt-elements-item-contentAccent transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm">▲</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-bolt-elements-textPrimary">Vercel</div>
              <div className="text-xs text-bolt-elements-textSecondary">Deploy to Vercel</div>
            </div>
          </button>

          <button
            onClick={() => handleDeploy('cloudflare')}
            className="flex items-center gap-3 p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:border-bolt-elements-item-contentAccent transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-bolt-elements-textPrimary">Cloudflare Pages</div>
              <div className="text-xs text-bolt-elements-textSecondary">Deploy to Cloudflare</div>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setShowDeployDialog(false)}
            className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </Dialog>
    </>
  );
}
