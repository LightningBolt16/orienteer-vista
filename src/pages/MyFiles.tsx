
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Folder, File, Clock } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const MyFiles: React.FC = () => {
  const { t } = useLanguage();
  
  // Dummy file data for the file explorer
  const files = [
    { id: 1, name: 'Project 1', type: 'folder', modified: '2023-05-12' },
    { id: 2, name: 'Training Routes', type: 'folder', modified: '2023-06-18' },
    { id: 3, name: 'Competition_2023.map', type: 'file', modified: '2023-04-22' },
    { id: 4, name: 'Training_Plan.pdf', type: 'file', modified: '2023-07-01' },
    { id: 5, name: 'Team Event', type: 'folder', modified: '2023-03-15' },
  ];

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="glass-card p-8 mt-8 relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg">
          <Clock className="h-12 w-12 text-orienteering mb-4" />
          <h2 className="text-2xl font-medium text-foreground">{t('coming.soon')}</h2>
        </div>
        
        {/* File Explorer UI (blurred in background) */}
        <div className="opacity-50">
          <h1 className="text-2xl font-bold mb-6">{t('my.files')}</h1>
          
          <div className="rounded-lg border border-border overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">{t('name')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('modified')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-medium flex items-center gap-2">
                        {file.type === 'folder' ? 
                          <Folder className="h-4 w-4 text-orienteering" /> : 
                          <File className="h-4 w-4 text-muted-foreground" />
                        }
                        {file.name}
                      </TableCell>
                      <TableCell>
                        {file.type === 'folder' ? t('folder') : t('file')}
                      </TableCell>
                      <TableCell>{file.modified}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyFiles;
