// Algerian municipalities organized by wilaya
import municipalitiesData from './data/municipalities.json';

interface MunicipalityRecord {
  id: number;
  commune_name: string;
  daira_name: string;
  wilaya_code: string;
  wilaya_name: string;
}

// Create a map of wilaya -> communes (municipalities)
let wilayaMunicipalitiesMap: Map<string, string[]> | null = null;

// Load and process municipalities data
function loadMunicipalitiesData() {
  if (wilayaMunicipalitiesMap) {
    return;
  }

  try {
    const records: MunicipalityRecord[] = municipalitiesData;
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
    console.error('Error loading municipalities:', error);
    wilayaMunicipalitiesMap = new Map();
  }
}

// Helper function to get municipalities for a specific wilaya
export const getMunicipalitiesForWilaya = async (wilaya: string): Promise<string[]> => {
  if (!wilayaMunicipalitiesMap) {
    loadMunicipalitiesData();
  }
  return (wilayaMunicipalitiesMap && wilayaMunicipalitiesMap.get(wilaya)) || [];
};

// Sync version for immediate access (returns cached or empty)
export const getMunicipalitiesForWilayaSync = (wilaya: string): string[] => {
  if (!wilayaMunicipalitiesMap) {
    loadMunicipalitiesData();
  }
  return wilayaMunicipalitiesMap.get(wilaya) || [];
};

// Preload municipalities on module load
loadMunicipalitiesData();
