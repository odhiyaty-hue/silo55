// Algerian municipalities organized by wilaya

interface MunicipalityRecord {
  id: number;
  commune_name: string;
  daira_name: string;
  wilaya_code: string;
  wilaya_name: string;
}

// Create a map of wilaya -> communes (municipalities)
let wilayaMunicipalitiesMap: Map<string, string[]> | null = null;
let isLoading = false;
let loadError: Error | null = null;

// Load and process municipalities data
async function loadMunicipalitiesData() {
  if (wilayaMunicipalitiesMap || isLoading) {
    return;
  }

  isLoading = true;
  try {
    const response = await fetch('/data/municipalities.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch municipalities data: ${response.statusText}`);
    }
    
    const records: MunicipalityRecord[] = await response.json();
    const tempMap = new Map<string, string[]>();

    records.forEach((record) => {
      const wilayaName = record.wilaya_name.trim();
      const communeName = record.commune_name.trim();
      
      if (!tempMap.has(wilayaName)) {
        tempMap.set(wilayaName, []);
      }
      
      const communes = tempMap.get(wilayaName)!;
      if (!communes.includes(communeName)) {
        communes.push(communeName);
      }
    });

    // Sort communes alphabetically for each wilaya
    tempMap.forEach((communes) => {
      communes.sort();
    });

    wilayaMunicipalitiesMap = tempMap;
  } catch (error) {
    loadError = error instanceof Error ? error : new Error('Unknown error loading municipalities');
    console.error('Error loading municipalities:', loadError);
    wilayaMunicipalitiesMap = new Map();
  } finally {
    isLoading = false;
  }
}

// Helper function to get municipalities for a specific wilaya
export const getMunicipalitiesForWilaya = async (wilaya: string): Promise<string[]> => {
  if (!wilayaMunicipalitiesMap && !isLoading) {
    await loadMunicipalitiesData();
  }
  return wilayaMunicipalitiesMap?.get(wilaya) || [];
};

// Sync version for immediate access (returns cached or empty)
export const getMunicipalitiesForWilayaSync = (wilaya: string): string[] => {
  if (!wilayaMunicipalitiesMap) {
    // Trigger async load
    loadMunicipalitiesData().catch(console.error);
    return [];
  }
  return wilayaMunicipalitiesMap.get(wilaya) || [];
};

// Preload municipalities on module load
if (typeof window !== 'undefined') {
  loadMunicipalitiesData().catch(console.error);
}
