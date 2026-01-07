import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { useLanguage } from '../context/LanguageContext';
import { getAvailableMaps, getUniqueMapNames } from '../utils/routeDataUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [availableMapNames, setAvailableMapNames] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('all');

  useEffect(() => {
    const loadMaps = async () => {
      // Only show public maps in leaderboard - pass no userId to get only public maps
      const maps = await getAvailableMaps();
      const uniqueNames = getUniqueMapNames(maps);
      setAvailableMapNames(uniqueNames);
    };
    loadMaps();
  }, []);

  return (
    <div className="animate-fade-in pb-12">
      <div className="glass-card p-8 md:p-12 rounded-3xl mb-8">
        <div className="flex items-center justify-center mb-6">
          <Trophy className="h-10 w-10 text-orienteering mr-4" />
          <h1 className="text-4xl md:text-5xl font-bold">{t('routeChoiceChampions')}</h1>
        </div>
        
        <p className="text-xl text-muted-foreground text-center mb-8">
          {t('competeWithOthers')}
        </p>

        {/* Map Filter Tabs */}
        <Tabs value={selectedMap} onValueChange={setSelectedMap} className="w-full">
          <TabsList className="w-full flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-6">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
            >
              {t('allMaps') || 'All Maps'}
            </TabsTrigger>
            {availableMapNames.map(mapName => (
              <TabsTrigger 
                key={mapName} 
                value={mapName}
                className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
              >
                {mapName}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <Leaderboard mapFilter="all" />
          </TabsContent>
          
          {availableMapNames.map(mapName => (
            <TabsContent key={mapName} value={mapName} className="mt-0">
              <Leaderboard mapFilter={mapName} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default LeaderboardPage;
