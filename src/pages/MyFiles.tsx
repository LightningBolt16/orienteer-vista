
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import ProjectsView from '../components/ProjectsView';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const MyFiles: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mt-8 mb-4">
        <h1 className="text-2xl font-bold">{t('myPurplePenProjects')}</h1>
        <Button onClick={() => navigate('/course-setter')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newProject')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('previousProjects')}</CardTitle>
          <CardDescription>{t('viewManageProjects')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsView />
        </CardContent>
      </Card>
    </div>
  );
};

export default MyFiles;
