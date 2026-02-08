import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Globe, MapPin, Route } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { useLanguage } from '../context/LanguageContext';
import { getAvailableMaps, getUniqueMapNames } from '../utils/routeDataUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRIES, getCountryFlag, getCountryName } from '@/components/CountrySelector';
import RouteFinderLeaderboardInline from '@/components/route-finder/RouteFinderLeaderboardInline';

const LeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [availableMapNames, setAvailableMapNames] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<'routeChoice' | 'routeFinder'>('routeChoice');

  useEffect(() => {
    const loadMaps = async () => {
      // Only show public maps in leaderboard - pass no userId to get only public maps
      const maps = await getAvailableMaps();
      const uniqueNames = getUniqueMapNames(maps);
      setAvailableMapNames(uniqueNames);
    };
    loadMaps();
  }, []);

  // Fetch available countries from user_profiles
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('country_code')
          .not('country_code', 'is', null);
        
        if (error) throw error;
        
        // Get unique country codes
        const uniqueCodes = [...new Set(data?.map(d => d.country_code).filter(Boolean) as string[])];
        setAvailableCountries(uniqueCodes.sort((a, b) => {
          const nameA = getCountryName(a);
          const nameB = getCountryName(b);
          return nameA.localeCompare(nameB);
        }));
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    loadCountries();
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

        {/* Game Mode Tabs */}
        <Tabs value={gameMode} onValueChange={(v) => setGameMode(v as 'routeChoice' | 'routeFinder')} className="w-full mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="routeChoice" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('routeChoice') || 'Route Choice'}
            </TabsTrigger>
            <TabsTrigger value="routeFinder" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              {t('routeFinder') || 'Route Finder'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {gameMode === 'routeChoice' ? (
          <>
            {/* Country Filter */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('filterByCountry') || 'Filter by country'}:</span>
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {countryFilter === 'all' ? (
                      <span>{t('allCountries') || 'All Countries'}</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>{getCountryFlag(countryFilter)}</span>
                        <span>{getCountryName(countryFilter)}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCountries') || 'All Countries'}</SelectItem>
                  {availableCountries.map(code => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <span>{getCountryFlag(code)}</span>
                        <span>{getCountryName(code)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <Leaderboard 
                  mapFilter="all" 
                  countryFilter={countryFilter !== 'all' ? countryFilter : undefined}
                  showAll
                />
              </TabsContent>
              
              {availableMapNames.map(mapName => (
                <TabsContent key={mapName} value={mapName} className="mt-0">
                  <Leaderboard 
                    mapFilter={mapName}
                    countryFilter={countryFilter !== 'all' ? countryFilter : undefined}
                    showAll
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <RouteFinderLeaderboardInline />
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
