
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import CourseList from '../CourseList';
import { Course } from '../../hooks/useEventState';

interface CourseEditorProps {
  currentCourse: Course | null;
  courses: Course[];
  mapType: 'sprint' | 'forest';
  mapScale: string;
  onSelectCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onAddCourse: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ 
  currentCourse,
  courses,
  mapType,
  mapScale,
  onSelectCourse,
  onUpdateCourse,
  onAddCourse
}) => {
  const { t } = useLanguage();

  if (!currentCourse) return null;

  return (
    <div className="w-64 border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold">{t('courses')}</h3>
          <Button size="sm" variant="ghost" onClick={onAddCourse}>
            <PlusCircle className="h-4 w-4 mr-1" />
            {t('add')}
          </Button>
        </div>
        
        <ScrollArea className="h-48 pr-3">
          <CourseList 
            courses={courses}
            activeCourseId={currentCourse?.id}
            onSelectCourse={onSelectCourse}
          />
        </ScrollArea>
      </div>
      
      {currentCourse && (
        <div className="p-4 flex-1 overflow-auto">
          <div className="space-y-4">
            <div>
              <Label>{t('course.name')}</Label>
              <Input 
                value={currentCourse.name} 
                onChange={(e) => onUpdateCourse(currentCourse.id, { name: e.target.value })}
                disabled={currentCourse.id === 'course-all-controls'}
              />
            </div>
            
            <div>
              <Label>{t('course.length')} (km)</Label>
              <Input 
                type="number"
                step="0.1"
                value={currentCourse.length || ''} 
                onChange={(e) => onUpdateCourse(currentCourse.id, { length: parseFloat(e.target.value) || 0 })}
                disabled={currentCourse.id === 'course-all-controls'}
              />
            </div>
            
            <div>
              <Label>{t('course.climb')} (m)</Label>
              <Input 
                type="number"
                value={currentCourse.climb || ''} 
                onChange={(e) => onUpdateCourse(currentCourse.id, { climb: parseInt(e.target.value) || 0 })}
                disabled={currentCourse.id === 'course-all-controls'}
              />
            </div>
            
            <div>
              <Label>{t('course.scale')}</Label>
              <Select 
                value={currentCourse.scale || mapScale}
                onValueChange={(value) => onUpdateCourse(currentCourse.id, { scale: value })}
                disabled={currentCourse.id === 'course-all-controls'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select.scale')} />
                </SelectTrigger>
                <SelectContent>
                  {mapType === 'sprint' ? (
                    <>
                      <SelectItem value="4000">1:4,000</SelectItem>
                      <SelectItem value="3000">1:3,000</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="15000">1:15,000</SelectItem>
                      <SelectItem value="10000">1:10,000</SelectItem>
                      <SelectItem value="7500">1:7,500</SelectItem>
                    </>
                  )}
                  <SelectItem value="5000">1:5,000</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              
              {currentCourse.scale === 'custom' && (
                <div className="mt-2 flex items-center">
                  <span className="mr-2">1:</span>
                  <Input
                    type="text"
                    placeholder="Custom scale"
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      if (value && !isNaN(parseInt(value))) {
                        onUpdateCourse(currentCourse.id, { scale: value });
                      }
                    }}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label>{t('course.description')}</Label>
              <Textarea 
                value={currentCourse.description} 
                onChange={(e) => onUpdateCourse(currentCourse.id, { description: e.target.value })}
                disabled={currentCourse.id === 'course-all-controls'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add missing import
import { PlusCircle } from 'lucide-react';

export default CourseEditor;
