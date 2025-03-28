
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import ProjectsView from '../components/ProjectsView';

const MyFiles: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="glass-card p-8 mt-8">
        <ProjectsView />
      </div>
    </div>
  );
};

export default MyFiles;
