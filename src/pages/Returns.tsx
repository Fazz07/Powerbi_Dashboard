import { useEffect, useRef, useState } from 'react';
import * as powerbi from 'powerbi-client';
import { DollarSign, Filter, ChevronDown,PieChart } from 'lucide-react';
import { parseData } from '../utils/utils';

// Define interfaces for type safety
interface EmbedData {
  embedUrl: string;
  token: string;
  reportId: string;
}

// Interface for visual configuration
interface VisualConfig {
  visualName: string;
  stateSetter: (value: string) => void;
}

// Define filter options interface
interface FilterOption {
  id: string;
  label: string;
  value: string;
}

// Define filter Store interface
interface FilterCategory {
  name: string;
  key: string;
  options: FilterOption[];
}

export default function Returns() {
  // State for embed data and metrics
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const [returns, setReturns] = useState<string>("loading...");
  const [unitsReturned, setUnitsReturned] = useState<string>("loading...");

  // Filter state
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>("Store");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStore, setSelectedStore] = useState<string>("All");

  // Filter categories and options based on the image
  const filterCategories: FilterCategory[] = [
    {
      name: "Store",
      key: "Store",
      options: [
        { id: "all", label: "All Categories", value: "All" },
        { id: "Abbas", label: "Abbas", value: "Abbas" },
        { id: "Aliqui", label: "Aliqui", value: "Aliqui" },
        { id: "Barba", label: "Barba", value: "Barba" },
        { id: "Contoso", label: "Contoso", value: "Contoso" },
        { id: "Fama", label: "Fama", value: "Fama" },
        { id: "Leo", label: "Leo", value: "Leo" },
        { id: "Natura", label: "Natura", value: "Natura" },
        { id: "Palma", label: "Palma", value: "Palma" },
        { id: "Pirum", label: "Pirum", value: "Pirum" },
        { id: "Pomum", label: "Pomum", value: "Pomum" }
      ]
    },
    {
      name: "Segment",
      key: "Segment",
      options: [
        { id: "all-stores", label: "All Stores", value: "All" },
        { id: "Blue", label: "Blue", value: "Blue" },
        { id: "Cyan", label: "Cyan", value: "Cyan" },
        { id: "Green", label: "Green", value: "Green" },
        { id: "Jade", label: "Jade", value: "Jade" },
        { id: "Magenta", label: "Magenta", value: "Magenta" },
        { id: "Neon Blue", label: "Neon Blue", value: "Neon Blue" },
        { id: "Orange", label: "Orange", value: "Orange" },
        { id: "Purple", label: "Purple", value: "Purple" },
        { id: "Red", label: "Red", value: "Red" },
        { id: "Royal Blue", label: "Royal Blue", value: "Royal Blue" },
        { id: "Turquoise", label: "Turquoise", value: "Turquoise" },
        { id: "Yellow", label: "Yellow", value: "Yellow" }
      ]
    }
  ];

  // Refs for visible visuals
  const categoryRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef<HTMLDivElement>(null);

  // Ref for single hidden report embedding
  const hiddenReportRef = useRef<HTMLDivElement>(null);

  // Reference to the embedded report for data extraction
  const reportInstanceRef = useRef<powerbi.Report | null>(null);

  // Segment embedded visual instances for applying filters
  const visualInstancesRef = useRef<{
    category?: powerbi.Embed;
    store?: powerbi.Embed;
  }>({});

  // Track embed status for visible visuals only
  const [embeddedVisuals, setEmbeddedVisuals] = useState<Record<string, boolean>>({
    category: false,
    store: false,
  });

  // Power BI service instance, initialized once
  const powerbiServiceRef = useRef<powerbi.service.Service | null>(null);

  // Initialize Power BI service on component mount
  useEffect(() => {
    powerbiServiceRef.current = new powerbi.service.Service(
      powerbi.factories.hpmFactory,
      powerbi.factories.wpmpFactory,
      powerbi.factories.routerFactory
    );
  }, []);

  // Fetch the embed token and URL on mount
  useEffect(() => {
    async function fetchEmbedToken() {
      try {
        const response = await fetch(`${apiUrl}/getEmbedToken`);
        const data = await response.json();
        console.log('Embed Data:', data);
        if (data.token && data.embedUrl) {
          setEmbedData(data);
        } else {
          console.error('Missing token or embedUrl in the response');
        }
      } catch (error) {
        console.error('Error fetching embed token:', error);
      }
    }
    fetchEmbedToken();
  }, []);

  // Map of pages to their visuals for data extraction
  const allVisualsMap: Record<string, VisualConfig[]> = {
    'ReportSection998e2850a99cabad87e8': [
      { visualName: 'c22adfcca77c7baf5f51', stateSetter: setReturns },
      { visualName: '449292750b491085de51', stateSetter: setUnitsReturned },
    ],
  };

  // Helper function to convert export result to CSV string
  async function getCsvData(exportResult: any): Promise<string> {
    if (exportResult instanceof Blob) {
      return exportResult.text();
    } else if (typeof exportResult === 'object' && exportResult.data) {
      return exportResult.data;
    } else if (typeof exportResult === 'string') {
      return exportResult;
    } else {
      throw new Error('Unexpected export data format');
    }
  }

  // Embed report once and extract data from all visuals
  useEffect(() => {
    if (!embedData || !hiddenReportRef.current || !powerbiServiceRef.current) return;

    const reportConfig = {
      type: 'report',
      tokenType: powerbi.models.TokenType.Embed,
      permissions: powerbi.models.Permissions.Read,
      embedUrl: embedData.embedUrl,
      accessToken: embedData.token,
      id: embedData.reportId,
      settings: {
        filterPaneEnabled: false,
        navContentPaneEnabled: false,
      },
    };

    const powerbiService = powerbiServiceRef.current;

    try {
      const report = powerbiService.embed(hiddenReportRef.current, reportConfig) as powerbi.Report;
      // Store the report instance for later use
      reportInstanceRef.current = report;

      report.on('loaded', () => {
        console.log('Report Loaded for data extraction');
        extractDataWithCurrentFilters();
      });

      report.on('error', (event) => {
        console.error('Report Embed Error:', event.detail);
      });
    } catch (error) {
      console.error('Error embedding report for data extraction:', error);
    }
  }, [embedData]);


/**
 * Extracts data from all visuals with the current filter state
 * This function can be called whenever filters change
 */
  const extractDataWithCurrentFilters = async () => {
    if (!reportInstanceRef.current) {
      console.error('Report not embedded yet');
      return;
    }

    console.log('Extracting data with current filters - Category:', selectedCategory, 'Store:', selectedStore);
    const report = reportInstanceRef.current;

    // Create filters based on current selections
    const filters: powerbi.models.IBasicFilter[] = [];

    if (selectedCategory !== "All") {
      filters.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: "Store",
          column: "Store",
        },
        operator: "In",
        values: [selectedCategory],
        filterType: powerbi.models.FilterType.Basic,
      });
    }

    if (selectedStore !== "All") {
      filters.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: "Product",
          column: "Segment",
        },
        operator: "In",
        values: [selectedStore],
        filterType: powerbi.models.FilterType.Basic,
      });
    }

    // Process each page and extract data from all specified visuals with applied filters
    for (const [pageName, visuals] of Object.entries(allVisualsMap)) {
      try {
        const pages = await report.getPages();
        const targetPage = pages.find((page) => page.name === pageName);
        if (!targetPage) {
          console.error(`Page ${pageName} not found`);
          continue;
        }

        // Activate the page
        await targetPage.setActive();

        // Apply filters to the page (affects all visuals on the page)
        await targetPage.setFilters(filters);

        // Get all visuals after filters are applied
        const visualsList = await targetPage.getVisuals();

        // Extract data from each specified visual
        const exportPromises = visuals.map(({ visualName, stateSetter }) => {
          const visual = visualsList.find((v) => v.name === visualName);
          if (!visual) {
            console.error(`Visual ${visualName} not found on page ${pageName}`);
            return Promise.resolve();
          }

          return visual
            .exportData(powerbi.models.ExportDataType.Summarized)
            .then(async (exportResult) => {
              const csvData = await getCsvData(exportResult);
              const value = parseData(csvData);
              console.log(`Updated data for ${visualName}:`, value);
              stateSetter(value);
            })
            .catch((error) => {
              console.error(`Error exporting data from visual ${visualName}:`, error);
            });
        });

        await Promise.all(exportPromises);
      } catch (error) {
        console.error(`Error processing page ${pageName}:`, error);
      }
    }
  };

/**
 * Handles selections made in visuals and applies appropriate cross-filters
 * @param sourceVisualKey - The visual where the selection was made
 * @param selection - The selection event details
 */
const handleVisualSelection = async (sourceVisualKey: string, selection: any) => {
  // Early return if no data points were selected
  if (!selection.dataPoints || selection.dataPoints.length === 0) {
    return;
  }

  // Get the first selected data point
  const selectedPoint = selection.dataPoints[0];
  console.log(`Detailed selectedPoint object:`, selectedPoint);

  // Verify we have the required identity data structure
  if (!selectedPoint.identity || !selectedPoint.identity.length || !selectedPoint.identity[0].target) {
    console.warn('Selected data point does not contain the expected identity structure');
    return;
  }

  // Extract the identity from the first data point
  const identity = selectedPoint.identity[0];
  
  // Extract the target table and column
  const targetTable = identity.target.table;
  const targetColumn = identity.target.column;
  
  // Extract the selected value from the 'equals' property
  let selectedValue = identity.equals;
  
  if (!selectedValue) {
    console.warn('No selected value found in the identity.equals property');
    return;
  }

  if (selectedValue === "Pirum") {
    selectedValue = "Leo";
    console.log('Replaced "Pirum" with "Leo"');
  }
  if (selectedValue === "OneNote") {
    selectedValue = "Fama";
    console.log('Replaced "OneNote" with "Fama"');
  }
  if (selectedValue === "Publisher") {
    selectedValue = "Abbas";
    console.log('Replaced "Publisher" with "Fama"');
  }
  if (selectedValue === "SharePoint") {
    selectedValue = "Barba";
    console.log('Replaced "SharePoint" with "Barba"');
  }
  if (selectedValue === "Kaizala") {
    selectedValue = "Leo";
    console.log('Replaced "Kaizala" with "Leo"');
  }
  if (selectedValue === "PowerApps") {
    selectedValue = "Palma";
    console.log('Replaced "PowerApps" with "Palma"');
  }
  if (selectedValue === "Access") {
    selectedValue = "Aliqui";
    console.log('Replaced "Access" with "Aliqui"');
  }
  if (selectedValue === "Word") {
    selectedValue = "Contoso";
    console.log('Replaced "Word" with "Contoso"');
  }
  if (selectedValue === "Exchange") {
    selectedValue = "Leo";
    console.log('Replaced "Exchange" with "Leo"');
  }
  if (selectedValue === "Planner") {
    selectedValue = "Fama";
    console.log('Replaced "Planner" with "Fama"');
  }
  if (selectedValue === "Stream" || selectedValue === "PowerPoint" || selectedValue === "Teams" || selectedValue === "Visio" || selectedValue === "Outlook" || selectedValue === "Excel" || selectedValue === "Skype" || selectedValue === "Forms") {
    const options = ['Barba', 'Contoso', 'Fama', 'Leo', 'Natura','Palma', 'Pomum'];
    selectedValue = options[Math.floor(Math.random() * options.length)];
    console.log('Replaced with random value:', selectedValue);
  }
  
  console.log(`Selection extracted - Table: ${targetTable}, Column: ${targetColumn}, Value: ${selectedValue}`);
  
  // Determine filter type and update state based on the target table and column
  if (targetTable === 'Product' && targetColumn === 'Product') {
    // This is a product selection, which according to the log is what we're seeing
    console.log(`Setting Category filter to: ${selectedValue}`);
    setSelectedCategory(String(selectedValue));
  } else if (targetTable === 'Store' && targetColumn === 'Store') {
    // This would be a store selection
    console.log(`Setting Store filter to: ${selectedValue}`);
    setSelectedCategory(String(selectedValue));
  } else if (targetTable === 'Product' && targetColumn === 'Segment') {
    // This would be a segment selection
    console.log(`Setting Segment filter to: ${selectedValue}`);
    setSelectedStore(String(selectedValue));
  } else {
    console.warn(`Unexpected selection type: ${targetTable}.${targetColumn}`);
    return;
  }
  
  // Determine which visual to filter (the one that wasn't clicked)
  const targetVisualKey = sourceVisualKey === 'category' ? 'store' : 'category';
  
  // Create filter based on selection
  const filter: powerbi.models.IBasicFilter = {
    $schema: "http://powerbi.com/product/schema#basic",
    target: {
      table: targetTable,
      column: targetColumn
    },
    operator: "In",
    values: [selectedValue],
    filterType: powerbi.models.FilterType.Basic
  };
  
  // Apply the filter to the target visual
  const targetVisual = visualInstancesRef.current[targetVisualKey as 'category' | 'store'];
  if (targetVisual) {
    try {
      await (targetVisual as powerbi.Visual).setFilters([filter]);
      console.log(`Cross-filter applied to ${targetVisualKey} visual:`, filter);
      
      // Important fix: Explicitly update metrics after cross-filtering is applied
      // This ensures metrics are always updated after visual selection
      await extractDataWithCurrentFilters();
    } catch (error) {
      console.error(`Error applying cross-filter to ${targetVisualKey} visual:`, error);
    }
  }
};

/**
 * Modify the embedVisualChart function to properly register the data selection event
 */
function embedVisualChart(
  visualKey: string,
  ref: React.RefObject<HTMLDivElement>,
  pageName: string,
  visualName: string
) {
  if (!embedData || !ref.current || embeddedVisuals[visualKey] || !powerbiServiceRef.current) {
    return;
  }

  ref.current.innerHTML = '';

  const embedConfig = {
    type: 'visual',
    tokenType: powerbi.models.TokenType.Embed,
    permissions: powerbi.models.Permissions.Read,
    embedUrl: embedData.embedUrl,
    accessToken: embedData.token,
    id: embedData.reportId,
    pageName: pageName,
    visualName: visualName,
    settings: {
      filterPaneEnabled: false,
    },
  };

  try {
    const visual = powerbiServiceRef.current.embed(ref.current, embedConfig);
    
    // Store the visual instance for later filter application
    visualInstancesRef.current[visualKey as 'category' | 'store'] = visual;
    
    visual.on('loaded', () => {
      console.log(`${visualKey} Visual Loaded`);
      
      // Add data selection event handler with detailed logging
      visual.on('dataSelected', (event) => {
        console.log(`Selection in ${visualKey}:`, event.detail);
        
        const selection = event.detail as { dataPoints: any[] };
        
        if (selection && selection.dataPoints && selection.dataPoints.length > 0) {
          handleVisualSelection(visualKey, selection);
        } else {
          // If selection is cleared, remove cross-filters
          clearCrossFilters(visualKey);
        }
      });
    });
    
    visual.on('error', (event) => console.error(`${visualKey} Embed Error:`, event.detail));

    setEmbeddedVisuals((prev) => ({ ...prev, [visualKey]: true }));
  } catch (error) {
    console.error(`Error embedding ${visualKey} visual:`, error);
  }
}

/**
 * Clears cross-filters when a selection is cleared
 * @param sourceVisualKey - The visual where the selection was cleared
 */
const clearCrossFilters = async (sourceVisualKey: string) => {
  console.log(`Clearing cross-filters from ${sourceVisualKey}`);
  
  // Determine which visual to clear from (the one that wasn't clicked)
  const targetVisualKey = sourceVisualKey === 'category' ? 'store' : 'category';
  
  // Reset filter state based on the visual that was cleared
  if (sourceVisualKey === 'category') {
    setSelectedCategory("All");
  } else {
    setSelectedStore("All");
  }
  
  // Get the target visual instance
  const targetVisual = visualInstancesRef.current[targetVisualKey as 'category' | 'store'];
  if (targetVisual) {
    try {
      // Remove all filters from the target visual
      await (targetVisual as powerbi.Visual).removeFilters();
      console.log(`Filters cleared from ${targetVisualKey} visual`);
      
      // Apply any remaining filters if needed
      if ((sourceVisualKey === 'category' && selectedStore !== "All") || 
          (sourceVisualKey === 'store' && selectedCategory !== "All")) {
        await applyFilters();
      } else {
        // If both are "All", update metrics with no filters
        await extractDataWithCurrentFilters();
      }
    } catch (error) {
      console.error(`Error clearing filters from ${targetVisualKey} visual:`, error);
    }
  } else {
    // If no visual instance, still update metrics
    await extractDataWithCurrentFilters();
  }
};

// Add a new function to handle double-click reset
const setupDoubleClickReset = () => {
  // For the category visual
  if (categoryRef.current) {
    categoryRef.current.addEventListener('dblclick', (event) => {
      console.log('Double-click detected on category visual');
      resetAllFilters();
    });
  }
  
  // For the Store visual
  if (storeRef.current) {
    storeRef.current.addEventListener('dblclick', (event) => {
      console.log('Double-click detected on store visual');
      resetAllFilters();
    });
  }
};

// Function to reset all filters and state
const resetAllFilters = async () => {
  setSelectedCategory("All");
  setSelectedStore("All");
  
  // clear from all visuals
  const clearPromises = Object.entries(visualInstancesRef.current).map(async ([key, visual]) => {
    if (visual) {
      try {
        await (visual as powerbi.Visual).removeFilters();
        console.log(`Filters cleared from ${key} visual`);
      } catch (error) {
        console.error(`Error clearing filters from ${key} visual:`, error);
      }
    }
  });
  
  // Wait for all filters to be cleared
  await Promise.all(clearPromises);
  
  // Update metrics with no filters
  await extractDataWithCurrentFilters();
};

// Add this to the useEffect after both visuals are embedded
useEffect(() => {
  // Check if both visuals are embedded
  if (embeddedVisuals['category'] && embeddedVisuals['store']) {
    console.log('Both visuals are embedded, setting up double-click handlers');
    setupDoubleClickReset();
  }
}, [embeddedVisuals]);

  // Embed Category Distribution visual
  useEffect(() => {
    embedVisualChart(
      'category',
      categoryRef,
      'ReportSection998e2850a99cabad87e8',
      '3a28c5fee26bd29ff352'
    );
  }, [embedData]);

  // Embed returns Store Trend visual
  useEffect(() => {
    embedVisualChart(
      'store',
      storeRef,
      'ReportSection998e2850a99cabad87e8',
      'd55aa7aa40745de10d55'
    );
  }, [embedData]);

  /**
   * Applies filters to all visuals based on selected Store and Segment
   * This creates a combined filter if both Store and Segment are selected
   */
  const applyFilters = async () => {
    console.log('applyFilters called with - selectedCategory:', selectedCategory, 'selectedStore:', selectedStore);
    const filters: powerbi.models.IBasicFilter[] = [];
    
    if (selectedCategory !== "All") {
      filters.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: "Store",
          column: "Store",
        },
        operator: "In",
        values: [selectedCategory],
        filterType: powerbi.models.FilterType.Basic,
      });
    }
    
    if (selectedStore !== "All") {
      filters.push({
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: "Product",
          column: "Segment",
        },
        operator: "In",
        values: [selectedStore],
        filterType: powerbi.models.FilterType.Basic,
      });
    }
    
    console.log('Filters to apply:', filters);
    
    const filterPromises = Object.entries(visualInstancesRef.current).map(async ([key, visual]) => {
      if (visual) {
        try {
          await (visual as powerbi.Visual).setFilters(filters);
          console.log(`Filters applied to ${key} visual:`, filters);
        } catch (error) {
          console.error(`Error applying filters to ${key} visual:`, error);
        }
      } else {
        console.log(`Visual ${key} not found`);
      }
    });
    
    // Wait for all filters to be applied
    await Promise.all(filterPromises);
    
    // Important fix: Always update metrics after applying filters
    await extractDataWithCurrentFilters();
  };
  
// Add this useEffect near the top of the component, after state declarations
useEffect(() => {
  console.log('Filters changed - selectedCategory:', selectedCategory, 'selectedStore:', selectedStore);
  // Avoid initial render calls with "loading..." state
  if (embedData) {
    applyFilters();
  }
}, [selectedCategory, selectedStore, embedData]);

// Update filter handlers to only set state
const handleCategoryChange = (Store: string) => {
  console.log('Setting selectedCategory to:', Store);
  setSelectedCategory(Store);
  setShowFilters(false);
};

const handleStoreChange = (Segment: string) => {
  console.log('Setting selectedStore to:', Segment);
  setSelectedStore(Segment);
  setShowFilters(false);
};
  
  /**
   * Clears a specific filter type and applies remaining filters
   * @param filterType - The type of filter to clear ("Store" or "Segment")
   */
  const clearFilter = (filterType: string) => {
    if (filterType === "Store") {
      setSelectedCategory("All");
    } else if (filterType === "Segment") {
      setSelectedStore("All");
    }
  };

  /**
   * Clears all filters from visuals and updates returns count
   */
  const clearFilters = async () => {
    setSelectedCategory("All");
    setSelectedStore("All");
    
    // clear from visible visuals
    const clearPromises = Object.entries(visualInstancesRef.current).map(async ([key, visual]) => {
      if (visual) {
        try {
          // Clear all filters for the visual
          await (visual as powerbi.Visual).removeFilters();
          console.log(`Filters cleared from ${key} visual`);
        } catch (error) {
          console.error(`Error clearing filters from ${key} visual:`, error);
        }
      }
    });
    
    // Wait for all filters to be cleared
    await Promise.all(clearPromises);
    
    // Update returns count with no filters
    await extractDataWithCurrentFilters();
  };

  /**
   * Toggle filter dropdown and set active filter Store
   * @param Store - The filter Store to activate ("Store" or "Segment")
   */
  const toggleFilterCategory = (Store: string) => {
    if (showFilters && activeFilterCategory === Store) {
      // If clicking the same Store that's already open, close the dropdown
      setShowFilters(false);
    } else {
      // Otherwise, open the dropdown with the selected Store
      setActiveFilterCategory(Store);
      setShowFilters(true);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 mt-[67px]">
        <h1 className="text-4xl font-bold">Returns</h1>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <div className="relative">
            <button 
              className={`flex items-center px-4 py-2 rounded-md shadow-sm focus:outline-none ${
                activeFilterCategory === "Store" && showFilters
                  ? "bg-gray-600 text-white"
                  : "bg-gray-500 text-white hover:bg-gray-600"
              }`}
              onClick={() => toggleFilterCategory("Store")}
            >
              <Filter className="w-4 h-4 mr-2" />
              Store
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {/* Store Filter Dropdown */}
            {showFilters && activeFilterCategory === "Store" && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Select Store</h3>
                  {filterCategories[0].options.map(option => (
                    <button
                      key={option.id}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedCategory === option.value 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleCategoryChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              className={`flex items-center px-4 py-2 rounded-md shadow-sm focus:outline-none ${
                activeFilterCategory === "Segment" && showFilters
                  ? "bg-gray-600 text-white"
                  : "bg-gray-500 text-white hover:bg-gray-600"
              }`}
              onClick={() => toggleFilterCategory("Segment")}
            >
              <Filter className="w-4 h-4 mr-2" />
              Segment
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {/* Segment Filter Dropdown */}
            {showFilters && activeFilterCategory === "Segment" && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Select Segment</h3>
                  {filterCategories[1].options.map(option => (
                    <button
                      key={option.id}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedStore === option.value 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleStoreChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
                    
          {/* clear Button */}
          {(selectedCategory !== "All" || selectedStore !== "All") && (
            <button
              className="bg-red-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-600 focus:outline-none"
              onClick={clearFilters}
            >
              clear
            </button>
          )}
        </div>
      </div>
  

      {/* Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">
          <div className="flex items-center">
            <DollarSign className="w-12 h-12 text-gray-500" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Return Rate</h3>
              <p className="text-2xl font-semibold">{returns}</p>
            </div>
          </div>
        </div>

        <div className="ml-1 bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 lg:col-start-3">
          <div className="flex items-center">
            <PieChart className="w-12 h-12 text-gray-500" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Units Returned</h3>
              <p className="text-2xl font-semibold">{unitsReturned}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Active filters display */}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Visual */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">
          <h2 className="text-lg font-semibold mb-4">Store Breakdown</h2>
          <div
            className="h-64 flex items-center justify-center bg-gray-100 rounded"
            ref={categoryRef}
          >
            {!embedData && <p className="text-gray-500">Loading visual...</p>}
          </div>
        </div>

        {/* returns Store Trend Visual */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">
          <h2 className="text-lg font-semibold mb-4">Segment Breakdown</h2>
          <div
            className="h-64 flex items-center justify-center bg-gray-100 rounded"
            ref={storeRef}
          >
            {!embedData && <p className="text-gray-500">Loading visual...</p>}
          </div>
        </div>
      </div>

      {/* Single hidden container for report embedding */}
      <div ref={hiddenReportRef} style={{ display: 'none' }}></div>
    </div>
  );
}