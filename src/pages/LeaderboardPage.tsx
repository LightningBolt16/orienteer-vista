import React, { useState, useEffect } from 'react';
import { Trophy, Globe, MapPin, Route, Users, Star } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';
import { useLanguage } from '../context/LanguageContext';
import { getAvailableMaps, getUniqueMapNames } from '../utils/routeDataUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRIES, getCountryFlag, getCountryName } from '@/components/CountrySelector';
import RouteFinderLeaderboardInline from '@/components/route-finder/RouteFinderLeaderboardInline';
import { useCommunityFavorites } from '@/hooks/useCommunityFavorites';
import CommunityMapBrowser from '@/components/map/CommunityMapBrowser';

const LeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [officialMapNames, setOfficialMapNames] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<'routeChoice' | 'routeFinder'>('routeChoice');
  const { favoriteMaps, favorites, toggleFavorite } = useCommunityFavorites();
  const [selectedCommunityMap, setSelectedCommunityMap] = useState<string>('');

  useEffect(() => {
    const loadMaps = async () => {
      const maps = await getAvailableMaps();
      const official = maps.filter(m => m.mapCategory === 'official');
      setOfficialMapNames(getUniqueMapNames(official));
    };
    loadMaps();
  }, []);

  // Set default community map when favorites load
  useEffect(() => {
    if (favoriteMaps.length > 0 && !selectedCommunityMap) {
      setSelectedCommunityMap(favoriteMaps[0].name);
    }
  }, [favoriteMaps, selectedCommunityMap]);

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

  const handleCommunityMapSelect = (mapName: string) => {
    setSelectedCommunityMap(mapName);
  };

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

        {/* Country Filter */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('filterByCountry')}:</span>
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {countryFilter === 'all' ? (
                  <span>{t('allCountries')}</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>{getCountryFlag(countryFilter)}</span>
                    <span>{getCountryName(countryFilter)}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCountries')}</SelectItem>
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
              {t('routeChoice')}
            </TabsTrigger>
            <TabsTrigger value="routeFinder" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              {t('routeFinder')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {gameMode === 'routeChoice' ? (
          <Tabs value={selectedMap} onValueChange={setSelectedMap} className="w-full">
            <TabsList className="w-full flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-6">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-orienteering data-[state=active]:text-white"
              >
                {t('allMaps')}
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
        ) : (
          <RouteFinderLeaderboardInline countryFilter={activeCountryFilter} mapCategory="official" />
        )}
      </div>

      {/* Community Leaderboards Section */}
      <div className="glass-card p-8 md:p-12 rounded-3xl">
        <div className="flex items-center justify-center mb-6">
          <Users className="h-8 w-8 text-orienteering mr-3" />
          <h2 className="text-3xl md:text-4xl font-bold">{t('communityLeaderboards')}</h2>
        </div>
        <p className="text-lg text-muted-foreground text-center mb-8">
          {t('communityLeaderboardsDesc')}
        </p>

        {gameMode === 'routeChoice' ? (
          <div>
            {/* Favorited maps quick-select tabs */}
            {favoriteMaps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  {t('favoritedMaps')}
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {favoriteMaps.map(map => (
                    <button 
                      key={map.id}
                      onClick={() => setSelectedCommunityMap(map.name)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedCommunityMap === map.name 
                          ? 'bg-orienteering text-white' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {map.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map Browser for discovery */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orienteering" />
                {t('discoverMaps')}
              </h3>
              <CommunityMapBrowser
                onSelectMap={handleCommunityMapSelect}
                selectedMapName={selectedCommunityMap}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            {/* Show leaderboard for currently selected community map */}
            {selectedCommunityMap && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orienteering" />
                  {selectedCommunityMap}
                </h3>
                <Leaderboard 
                  mapFilter={selectedCommunityMap}
                  countryFilter={activeCountryFilter}
                  showAll
                />
              </div>
            )}
          </div>
        ) : (
          <RouteFinderLeaderboardInline countryFilter={activeCountryFilter} mapCategory="community" />
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
