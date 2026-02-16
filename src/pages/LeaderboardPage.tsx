import React, { useState, useEffect } from 'react';
import { Trophy, Globe, MapPin, Route, Users } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { useLanguage } from '../context/LanguageContext';
import { getAvailableMaps, getUniqueMapNames } from '../utils/routeDataUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRIES, getCountryFlag, getCountryName } from '@/components/CountrySelector';
import RouteFinderLeaderboardInline from '@/components/route-finder/RouteFinderLeaderboardInline';

interface MapInfo {
  name: string;
  category: string;
}

const LeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [officialMapNames, setOfficialMapNames] = useState<string[]>([]);
  const [communityRouteChoiceNames, setCommunityRouteChoiceNames] = useState<string[]>([]);
  const [communityRouteFinderNames, setCommunityRouteFinderNames] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [selectedCommunityRCMap, setSelectedCommunityRCMap] = useState<string>('all');
  const [selectedCommunityRFMap, setSelectedCommunityRFMap] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<'routeChoice' | 'routeFinder'>('routeChoice');

  useEffect(() => {
    const loadMaps = async () => {
      // Load route choice maps and split by category
      const maps = await getAvailableMaps();
      const official = maps.filter(m => m.mapCategory === 'official');
      const community = maps.filter(m => m.mapCategory === 'community');
      setOfficialMapNames(getUniqueMapNames(official));
      setCommunityRouteChoiceNames(getUniqueMapNames(community));

      // Load route finder community maps
      const { data: rfMaps } = await supabase
        .from('route_finder_maps')
        .select('name, map_category')
        .eq('is_public', true);
      
      if (rfMaps) {
        const rfCommunity = rfMaps.filter(m => m.map_category === 'community').map(m => m.name);
        setCommunityRouteFinderNames(rfCommunity);
      }
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

  const activeCountryFilter = countryFilter !== 'all' ? countryFilter : undefined;

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

        {/* Country Filter - shared across all */}
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
            {/* Official Map Filter Tabs */}
            <Tabs value={selectedMap} onValueChange={setSelectedMap} className="w-full">
              <TabsList className="w-full flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-6">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
                >
                  {t('allMaps') || 'All Maps'}
                </TabsTrigger>
                {officialMapNames.map(mapName => (
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
                  countryFilter={activeCountryFilter}
                  showAll
                />
              </TabsContent>
              
              {officialMapNames.map(mapName => (
                <TabsContent key={mapName} value={mapName} className="mt-0">
                  <Leaderboard 
                    mapFilter={mapName}
                    countryFilter={activeCountryFilter}
                    showAll
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <RouteFinderLeaderboardInline countryFilter={activeCountryFilter} />
        )}
      </div>

      {/* Community Leaderboards Section */}
      {(communityRouteChoiceNames.length > 0 || communityRouteFinderNames.length > 0) && (
        <div className="glass-card p-8 md:p-12 rounded-3xl">
          <div className="flex items-center justify-center mb-6">
            <Users className="h-8 w-8 text-orienteering mr-3" />
            <h2 className="text-3xl md:text-4xl font-bold">{t('communityLeaderboards') || 'Community Leaderboards'}</h2>
          </div>
          <p className="text-lg text-muted-foreground text-center mb-8">
            {t('communityLeaderboardsDesc') || 'Rankings for community-created maps'}
          </p>

          {/* Community Route Choice */}
          {communityRouteChoiceNames.length > 0 && (
            <div className="mb-10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orienteering" />
                {t('routeChoice') || 'Route Choice'}
              </h3>
              <Tabs value={selectedCommunityRCMap} onValueChange={setSelectedCommunityRCMap} className="w-full">
                <TabsList className="w-full flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-6">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
                  >
                    {t('allMaps') || 'All Maps'}
                  </TabsTrigger>
                  {communityRouteChoiceNames.map(mapName => (
                    <TabsTrigger 
                      key={mapName} 
                      value={mapName}
                      className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
                    >
                      {mapName}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* For community "all", we show each community map's leaderboard separately since 
                    the main "all" leaderboard mixes official + community */}
                <TabsContent value="all" className="mt-0">
                  <div className="space-y-6">
                    {communityRouteChoiceNames.map(mapName => (
                      <div key={mapName}>
                        <h4 className="text-lg font-medium mb-2">{mapName}</h4>
                        <Leaderboard 
                          mapFilter={mapName}
                          countryFilter={activeCountryFilter}
                          showAll
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                {communityRouteChoiceNames.map(mapName => (
                  <TabsContent key={mapName} value={mapName} className="mt-0">
                    <Leaderboard 
                      mapFilter={mapName}
                      countryFilter={activeCountryFilter}
                      showAll
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* Community Route Finder */}
          {communityRouteFinderNames.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Route className="h-5 w-5 text-orienteering" />
                {t('routeFinder') || 'Route Finder'}
              </h3>
              <RouteFinderLeaderboardInline countryFilter={activeCountryFilter} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
