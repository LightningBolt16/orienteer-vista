import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Map, Clock, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useUserMaps, UserMap } from '@/hooks/useUserMaps';
import UserMapUploadWizard from '@/components/user-maps/UserMapUploadWizard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const UserMaps: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { userMaps, loading, fetchUserMaps, deleteUserMap } = useUserMaps();
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [deleteMapId, setDeleteMapId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserMaps();
    }
  }, [user, fetchUserMaps]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">
              You need to sign in to upload and manage your custom maps.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showUploadWizard) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <UserMapUploadWizard
          onComplete={() => {
            setShowUploadWizard(false);
            fetchUserMaps();
          }}
          onCancel={() => setShowUploadWizard(false)}
        />
      </div>
    );
  }

  const getStatusBadge = (status: UserMap['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="default"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return null;
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteMapId) {
      await deleteUserMap(deleteMapId);
      setDeleteMapId(null);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Custom Maps</h1>
          <p className="text-muted-foreground">Upload and manage your orienteering maps</p>
        </div>
        <Button onClick={() => setShowUploadWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Map
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : userMaps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Maps Yet</h2>
            <p className="text-muted-foreground mb-4">
              Upload your first orienteering map to generate custom routes.
            </p>
            <Button onClick={() => setShowUploadWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Your First Map
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userMaps.map((map) => (
            <Card key={map.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{map.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(map.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(map.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteMapId(map.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">ROI Points</p>
                    <p className="font-medium">{map.roi_coordinates?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Routes</p>
                    <p className="font-medium">{map.processing_parameters?.num_output_routes || 50}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distance Range</p>
                    <p className="font-medium">
                      {map.processing_parameters?.candidate_min_dist || 300}m - {map.processing_parameters?.candidate_max_dist || 1500}m
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{new Date(map.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {map.error_message && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{map.error_message}</p>
                  </div>
                )}
                {map.status === 'completed' && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/route-game?map=${map.id}`)}
                    >
                      Play Routes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteMapId} onOpenChange={() => setDeleteMapId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Map</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this map? This will also delete all generated routes and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserMaps;
