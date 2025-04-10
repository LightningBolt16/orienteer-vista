
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import ProjectsView from '../components/ProjectsView';
import { Plus, Calendar, Share2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Toggle } from '../components/ui/toggle';

const MyFiles: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showShared, setShowShared] = useState(false);
  
  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mt-8 mb-4">
        <h1 className="text-2xl font-bold">{t('myPurplePenProjects')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <Share2 className="h-4 w-4 mr-2" />
            {t('projectManager')}
          </Button>
          <Button onClick={() => navigate('/course-setter')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('newProject')}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{showShared ? t('sharedProjects') : t('previousProjects')}</CardTitle>
              <CardDescription>{showShared ? t('projectsSharedWithYou') : t('viewManageProjects')}</CardDescription>
            </div>
            <Toggle 
              pressed={showShared} 
              onPressedChange={setShowShared}
              aria-label="Toggle shared projects"
              className="px-4"
            >
              {showShared ? t('sharedWithMe') : t('myProjects')}
            </Toggle>
          </div>
        </CardHeader>
        <CardContent>
          <ProjectsView showShared={showShared} />
          
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{t('collaborativeTools')}</h3>
              <Button variant="link" onClick={() => navigate('/projects')}>
                {t('viewAll')}
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">{t('collaborateWithOthers')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Share2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('projectSharing')}</h4>
                      <p className="text-sm text-muted-foreground">{t('shareCourseSettings')}</p>
                      <Button variant="link" className="px-0" onClick={() => navigate('/projects')}>
                        {t('manageSharing')} →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('projectCalendar')}</h4>
                      <p className="text-sm text-muted-foreground">{t('trackDeadlines')}</p>
                      <Button variant="link" className="px-0" onClick={() => navigate('/projects')}>
                        {t('viewCalendar')} →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyFiles;
