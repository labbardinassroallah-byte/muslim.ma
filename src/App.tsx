import { useState, useEffect, useRef, useCallback } from 'react';
import { surahs, Surah } from './data/surahs';

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
}

type Reciter = {
  id: string;
  name: string;
  style: string;
};

const reciters: Reciter[] = [
  { id: 'ar.alafasy', name: 'Mishary Alafasy', style: 'Clear & Steady' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', style: 'Slow & Melodic' },
  { id: 'ar.husary', name: 'Mahmoud Al-Husary', style: 'Very Slow & Precise' },
  { id: 'ar.minshawi', name: 'Al-Minshawi', style: 'Slow & Emotional' },
  { id: 'ar.abdurrahmaansudais', name: 'Abdurrahmaan As-Sudais', style: 'Moderate' },
  { id: 'ar.maaboralshuraim', name: 'Saud Ash-Shuraim', style: 'Moderate' },
];

function App() {
  const [selectedSurah, setSelectedSurah] = useState<Surah>(surahs[0]);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showSurahList, setShowSurahList] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(reciters[0]);
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [completedAyahs, setCompletedAyahs] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch surah data
  useEffect(() => {
    const fetchSurah = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.alquran.cloud/v1/surah/${selectedSurah.number}/quran-uthmani-quran-academy`
        );
        const data = await response.json();
        if (data.code === 200) {
          setAyahs(data.data.ayahs);
          setCurrentAyahIndex(0);
          setProgress(0);
        }
      } catch (error) {
        console.error('Error fetching surah:', error);
      }
      setLoading(false);
    };
    fetchSurah();
  }, [selectedSurah]);

  // Auto-play next ayah
  useEffect(() => {
    if (autoPlay && isPlaying && audioRef.current) {
      const handleEnded = () => {
        const ayahKey = `${selectedSurah.number}:${currentAyahIndex + 1}`;
        setCompletedAyahs(prev => new Set([...prev, ayahKey]));
        
        if (currentAyahIndex < ayahs.length - 1) {
          setCurrentAyahIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setAutoPlay(false);
        }
      };
      
      audioRef.current.addEventListener('ended', handleEnded);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [autoPlay, isPlaying, currentAyahIndex, ayahs.length, selectedSurah.number]);

  // Play audio when current ayah changes (if autoPlay is on)
  useEffect(() => {
    if (autoPlay && isPlaying && audioRef.current) {
      const ayahNumber = getGlobalAyahNumber(selectedSurah.number, currentAyahIndex + 1);
      audioRef.current.src = `https://cdn.islamic.network/quran/audio/128/${selectedReciter.id}/${ayahNumber}.mp3`;
      audioRef.current.play().catch(() => {});
    }
  }, [currentAyahIndex, autoPlay, isPlaying, selectedReciter.id, selectedSurah.number]);

  // Update progress
  useEffect(() => {
    if (ayahs.length > 0) {
      setProgress(((currentAyahIndex + 1) / ayahs.length) * 100);
    }
  }, [currentAyahIndex, ayahs.length]);

  const getGlobalAyahNumber = (surahNum: number, ayahNum: number): number => {
    let total = 0;
    for (let i = 0; i < surahNum - 1; i++) {
      total += surahs[i].numberOfAyahs;
    }
    // Skip bismillah for surahs except Al-Fatiha and At-Tawbah
    if (surahNum > 1 && surahNum !== 9) {
      total += 1; // Bismillah counts as ayah 1
    }
    return total + ayahNum;
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const ayahNumber = getGlobalAyahNumber(selectedSurah.number, currentAyahIndex + 1);
      audioRef.current.src = `https://cdn.islamic.network/quran/audio/128/${selectedReciter.id}/${ayahNumber}.mp3`;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      setAutoPlay(true);
    }
  }, [isPlaying, selectedSurah.number, currentAyahIndex, selectedReciter.id]);

  const goToNextAyah = () => {
    if (currentAyahIndex < ayahs.length - 1) {
      setCurrentAyahIndex(prev => prev + 1);
      if (isPlaying && audioRef.current) {
        const ayahNumber = getGlobalAyahNumber(selectedSurah.number, currentAyahIndex + 2);
        audioRef.current.src = `https://cdn.islamic.network/quran/audio/128/${selectedReciter.id}/${ayahNumber}.mp3`;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const goToPrevAyah = () => {
    if (currentAyahIndex > 0) {
      setCurrentAyahIndex(prev => prev - 1);
      if (isPlaying && audioRef.current) {
        const ayahNumber = getGlobalAyahNumber(selectedSurah.number, currentAyahIndex);
        audioRef.current.src = `https://cdn.islamic.network/quran/audio/128/${selectedReciter.id}/${ayahNumber}.mp3`;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const goToSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    setShowSurahList(false);
    setIsPlaying(false);
    setAutoPlay(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const filteredSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString().includes(searchQuery) ||
    s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fontSizes = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-amber-50 text-gray-900'}`}>
      <audio ref={audioRef} />
      
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${darkMode ? 'bg-gray-900/90 border-gray-700' : 'bg-amber-50/90 border-amber-200'} border-b`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSurahList(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${darkMode ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              📖 Surah {selectedSurah.number}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {selectedSurah.englishName}
              </h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {selectedSurah.englishNameTranslation} • {selectedSurah.numberOfAyahs} Ayahs
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-100'}`}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-100'}`}
              title="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-amber-200'}`}>
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`max-w-6xl mx-auto px-4 py-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-amber-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reciter Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🎙️ Reciter
              </label>
              <select
                value={selectedReciter.id}
                onChange={(e) => setSelectedReciter(reciters.find(r => r.id === e.target.value) || reciters[0])}
                className={`w-full p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-amber-50 border-amber-300'} border`}
              >
                {reciters.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.style})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Font Size */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🔤 Arabic Font Size
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(Math.max(0, fontSize - 1))}
                  className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-100 hover:bg-amber-200'}`}
                >
                  A-
                </button>
                <span className="text-sm">Size {fontSize + 1}</span>
                <button
                  onClick={() => setFontSize(Math.min(4, fontSize + 1))}
                  className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-100 hover:bg-amber-200'}`}
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Surah Header */}
        <div className="text-center mb-8">
          <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {selectedSurah.englishName}
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedSurah.englishNameTranslation} • {selectedSurah.revelationType} • {selectedSurah.numberOfAyahs} Ayahs
          </p>
          
          {/* Bismillah */}
          {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
            <p className="mt-4 text-3xl md:text-4xl" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }} dir="rtl">
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
            </p>
          )}
        </div>

        {/* Ayah Display */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin text-4xl mb-4">📖</div>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading Surah...</p>
          </div>
        ) : ayahs.length > 0 ? (
          <div className="space-y-6">
            {/* Current Ayah - Large Display */}
            <div className={`rounded-2xl p-8 md:p-12 text-center ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-lg border border-amber-100'}`}>
              <div className={`text-sm font-medium mb-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Ayah {currentAyahIndex + 1} of {ayahs.length}
              </div>
              
              <p
                className={`leading-loose ${fontSizes[fontSize]} ${darkMode ? 'text-white' : 'text-gray-900'}`}
                style={{ fontFamily: "'Amiri Quran', 'Amiri', serif", lineHeight: '2.5' }}
                dir="rtl"
              >
                {ayahs[currentAyahIndex].text}
              </p>
              
              <div className={`mt-4 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Page {ayahs[currentAyahIndex].page} • Juz {ayahs[currentAyahIndex].juz}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={goToPrevAyah}
                disabled={currentAyahIndex === 0}
                className={`p-3 rounded-full transition-all ${
                  currentAyahIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-100 hover:bg-amber-200'
                }`}
              >
                ⏮️
              </button>
              
              <button
                onClick={togglePlay}
                className={`p-4 rounded-full text-xl transition-all transform hover:scale-105 ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                } shadow-lg`}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <button
                onClick={goToNextAyah}
                disabled={currentAyahIndex === ayahs.length - 1}
                className={`p-3 rounded-full transition-all ${
                  currentAyahIndex === ayahs.length - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-100 hover:bg-amber-200'
                }`}
              >
                ⏭️
              </button>
            </div>

            {/* Auto-play indicator */}
            {isPlaying && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                  <span className="animate-pulse">🔴</span>
                  Playing • Auto-advancing
                </div>
              </div>
            )}

            {/* All Ayahs List */}
            <div className={`mt-8 rounded-2xl p-6 ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/80 border border-amber-100'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                All Ayahs in this Surah
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {ayahs.map((ayah, index) => (
                  <div
                    key={ayah.number}
                    onClick={() => {
                      setCurrentAyahIndex(index);
                      if (isPlaying && audioRef.current) {
                        const ayahNumber = getGlobalAyahNumber(selectedSurah.number, index + 1);
                        audioRef.current.src = `https://cdn.islamic.network/quran/audio/128/${selectedReciter.id}/${ayahNumber}.mp3`;
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      index === currentAyahIndex
                        ? darkMode ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'
                        : darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-amber-50'
                    } ${completedAyahs.has(`${selectedSurah.number}:${index + 1}`) ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === currentAyahIndex
                          ? 'bg-emerald-500 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-amber-100 text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      <p
                        className={`text-right flex-1 ${index === currentAyahIndex ? '' : 'opacity-70'}`}
                        style={{ fontFamily: "'Amiri Quran', 'Amiri', serif", fontSize: '1.5rem', lineHeight: '2.2' }}
                        dir="rtl"
                      >
                        {ayah.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Surah List Modal */}
      {showSurahList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSurahList(false)} />
          <div className={`relative w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl`}>
            {/* Search */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-amber-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Select Surah</h3>
                <button
                  onClick={() => setShowSurahList(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-100'}`}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Search surahs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full p-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-amber-50 border-amber-300 placeholder-gray-500'} border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              />
            </div>
            
            {/* Surah List */}
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {filteredSurahs.map(surah => (
                <button
                  key={surah.number}
                  onClick={() => goToSurah(surah)}
                  className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                    surah.number === selectedSurah.number
                      ? darkMode ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-50'
                  }`}
                >
                  <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    surah.number === selectedSurah.number
                      ? 'bg-emerald-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-amber-100 text-gray-700'
                  }`}>
                    {surah.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{surah.englishName}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {surah.englishNameTranslation} • {surah.numberOfAyahs} ayahs
                    </div>
                  </div>
                  <span className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} style={{ fontFamily: "'Amiri', serif" }}>
                    {surah.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`text-center py-6 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        <p>Quran Recitation Helper • Read at your own pace 🤲</p>
        <p className="mt-1">Data from AlQuran.cloud API</p>
      </footer>
    </div>
  );
}

export default App;
