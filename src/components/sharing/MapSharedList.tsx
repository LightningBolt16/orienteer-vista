
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Eye, Edit, MessageSquare } from 'lucide-react';
import { Permission } from '../../types/project';

// Mock data for maps shared with the current user
const MOCK_SHARED_MAPS = [
  {
    id: 'map-1',
    name: 'Forest Area 2025',
    owner: 'Jane Smith',
    permission: 'view' as Permission,
    dateShared: '2025-01-15T10:00:00Z',
    imageUrl: 'https://placehold.co/600x400/green/white?text=Forest+Map',
    scale: '10000',
    type: 'forest'
  },
  {
    id: 'map-2',
    name: 'City Center Sprint',
    owner: 'John Doe',
    permission: 'edit' as Permission,
    dateShared: '2025-02-20T14:30:00Z',
    imageUrl: 'https://placehold.co/600x400/grey/white?text=City+Map',
    scale: '4000',
    type: 'sprint'
  },
  {
    id: 'map-3',
    name: 'Training Area',
    owner: 'Club Admin',
    permission: 'suggest' as Permission,
    dateShared: '2025-03-05T09:45:00Z',
    imageUrl: 'https://placehold.co/600x400/orange/white?text=Training+Map',
    scale: '7500',
    type: 'forest'
  }
];

const MapSharedList: React.FC = () => {
  const { t } = useLanguage();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const renderPermissionBadge = (permission: Permission) => {
    const styles = {
      view: 'bg-blue-100 text-blue-800',
      edit: 'bg-green-100 text-green-800',
      suggest: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge variant="outline" className={styles[permission]}>
        {permission === 'view' ? 'View only' : 
         permission === 'edit' ? 'Can edit' : 
         'Can suggest'}
      </Badge>
    );
  };

  const renderActionButton = (permission: Permission) => {
    if (permission === 'view') {
      return (
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      );
    } else if (permission === 'edit') {
      return (
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      );
    } else {
      return (
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Suggest
        </Button>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_SHARED_MAPS.map(map => (
          <Card key={map.id} className="overflow-hidden">
            <div className="aspect-[4/3] relative">
              <img 
                src={map.imageUrl} 
                alt={map.name}
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{map.name}</h3>
                  {renderPermissionBadge(map.permission)}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <div>Shared by: {map.owner}</div>
                  <div>Shared on: {formatDate(map.dateShared)}</div>
                  <div>Scale: 1:{parseInt(map.scale).toLocaleString()}</div>
                  <div>Type: {map.type === 'sprint' ? 'Sprint' : 'Forest'}</div>
                </div>
                
                <div className="pt-2">
                  {renderActionButton(map.permission)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {MOCK_SHARED_MAPS.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-medium mb-2">No maps shared with you</h3>
          <p className="text-muted-foreground">
            When other users share maps with you, they will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default MapSharedList;
