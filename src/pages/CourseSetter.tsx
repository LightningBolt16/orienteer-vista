
import React from 'react';
import ComingSoon from '../components/ComingSoon';
import { useLanguage } from '../context/LanguageContext';

const CourseSetter: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="max-w-md w-full">
        <ComingSoon />
      </div>
    </div>
  );
};

export default CourseSetter;
