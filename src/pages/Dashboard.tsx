import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as powerbi from 'powerbi-client';
import { Filter, ChevronDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableVisual } from '../components/DraggableComponent';

// Type Definitions
type VisualKey = 'category' | 'store' | 'salesByStore' | 'salesBySegment';
type VisualId = 'categoryVisual' | 'storeVisual' | 'salesByStoreVisual' | 'salesBySegmentVisual';

interface EmbedData {
  embedUrl: string;
  token: string;
  reportId: string;
}

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterCategory {
  name: string;
  key: string;
  options: FilterOption[];
}

interface VisualConfig {
  id: VisualId;
  key: VisualKey;
  title: string;
  pageName: string;
  visualName: string;
}

interface VisualInstances {
  category?: powerbi.Embed;
  store?: powerbi.Embed;
  salesByStore?: powerbi.Embed;
  salesBySegment?: powerbi.Embed;
}

export default function Dashboard() {
  // API and PowerBI Service
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const powerbiServiceRef = useRef<powerbi.service.Service | null>(null);
  
  // State Management
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('Store');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [visualOrder, setVisualOrder] = useState<VisualId[]>([
    'categoryVisual',
    'storeVisual',
    'salesByStoreVisual',
    'salesBySegmentVisual',
  ]);
  const [embeddedVisuals, setEmbeddedVisuals] = useState<Record<VisualKey, boolean>>({
    category: false,
    store: false,
    salesByStore: false,
    salesBySegment: false,
  });

  // Refs
  const visualRefs = {
    category: useRef<HTMLDivElement>(null),
    store: useRef<HTMLDivElement>(null),
    salesByStore: useRef<HTMLDivElement>(null),
    salesBySegment: useRef<HTMLDivElement>(null),
  };
  
  const visualInstancesRef = useRef<VisualInstances>({});

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoized Constants
  const filterCategories: FilterCategory[] = useMemo(() => [
    {
      name: 'Store',
      key: 'Store',
      options: [
        { id: 'all', label: 'All Categories', value: 'All' },
        { id: 'Abbas', label: 'Abbas', value: 'Abbas' },
        { id: 'Aliqui', label: 'Aliqui', value: 'Aliqui' },
        { id: 'Barba', label: 'Barba', value: 'Barba' },
        { id: 'Contoso', label: 'Contoso', value: 'Contoso' },
        { id: 'Fama', label: 'Fama', value: 'Fama' },
        { id: 'Leo', label: 'Leo', value: 'Leo' },
        { id: 'Natura', label: 'Natura', value: 'Natura' },
        { id: 'Palma', label: 'Palma', value: 'Palma' },
        { id: 'Pirum', label: 'Pirum', value: 'Pirum' },
        { id: 'Pomum', label: 'Pomum', value: 'Pomum' },
      ],
    },
    {
      name: 'Segment',
      key: 'Segment',
      options: [
        { id: 'all-stores', label: 'All Stores', value: 'All' },
        { id: 'Blue', label: 'Blue', value: 'Blue' },
        { id: 'Cyan', label: 'Cyan', value: 'Cyan' },
        { id: 'Green', label: 'Green', value: 'Green' },
        { id: 'Jade', label: 'Jade', value: 'Jade' },
        { id: 'Magenta', label: 'Magenta', value: 'Magenta' },
        { id: 'Neon Blue', label: 'Neon Blue', value: 'Neon Blue' },
        { id: 'Orange', label: 'Orange', value: 'Orange' },
        { id: 'Purple', label: 'Purple', value: 'Purple' },
        { id: 'Red', label: 'Red', value: 'Red' },
        { id: 'Royal Blue', label: 'Royal Blue', value: 'Royal Blue' },
        { id: 'Turquoise', label: 'Turquoise', value: 'Turquoise' },
        { id: 'Yellow', label: 'Yellow', value: 'Yellow' },
      ],
    },
  ], []);

  const visualConfigs: VisualConfig[] = useMemo(() => [
    {
      id: 'categoryVisual',
      key: 'category',
      title: 'Sales Analysis',
      pageName: 'ReportSectiona37d01e834c17d07bbeb',
      visualName: 'b33397810d555ca70a8c',
    },
    {
      id: 'storeVisual',
      key: 'store',
      title: 'Sales by Segment',
      pageName: 'ReportSection998e2850a99cabad87e8',
      visualName: '3a28c5fee26bd29ff352',
    },
    {
      id: 'salesByStoreVisual',
      key: 'salesByStore',
      title: 'Sales by Store',
      pageName: 'ReportSection4b3fbaa7dd7908d906d9',
      visualName: 'd55aa7aa40745de10d55',
    },
    {
      id: 'salesBySegmentVisual',
      key: 'salesBySegment',
      title: 'Forecast Analysis',
      pageName: 'ReportSectiona37d01e834c17d07bbeb',
      visualName: '805719ca6000cb000be2',
    },
  ], []);

  // Initialize PowerBI Service
  useEffect(() => {
    powerbiServiceRef.current = new powerbi.service.Service(
      powerbi.factories.hpmFactory,
      powerbi.factories.wpmpFactory,
      powerbi.factories.routerFactory
    );
  }, []);

  // Fetch Embed Token
  useEffect(() => {
    async function fetchEmbedToken() {
      try {
        const response = await fetch(`${apiUrl}/getEmbedToken`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
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
  }, [apiUrl]);

  // Map product values to standardized values
  const getStandardizedValue = useCallback((selectedValue: string): string => {
    const valueMap: Record<string, string> = {
      'Pirum': 'Leo',
      'OneNote': 'Fama',
      'Publisher': 'Abbas',
      'SharePoint': 'Barba',
      'Kaizala': 'Leo',
      'PowerApps': 'Palma',
      'Access': 'Aliqui',
      'Word': 'Contoso',
      'Exchange': 'Leo',
      'Planner': 'Fama',
    };

    // Handle Microsoft products with random assignment
    const msProducts = [
      'Stream', 'Power BI', 'PowerPoint', 'Teams', 'Visio', 
      'Outlook', 'Excel', 'Skype', 'Forms'
    ];
    
    if (msProducts.includes(selectedValue)) {
      const options = ['Barba', 'Contoso', 'Fama', 'Leo', 'Natura', 'Palma', 'Pomum'];
      return options[Math.floor(Math.random() * options.length)];
    }

    return valueMap[selectedValue] || selectedValue;
  }, []);

  // Handle drag-and-drop reordering of visuals
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setVisualOrder((items) => {
        const oldIndex = items.indexOf(active.id as VisualId);
        const newIndex = items.indexOf(over.id as VisualId);

        const newOrder = [...items];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as VisualId);

        return newOrder;
      });
    }
  }, []);

  // Create filter for PowerBI
  const createFilter = useCallback((table: string, column: string, value: string): powerbi.models.IBasicFilter => {
    return {
      $schema: 'http://powerbi.com/product/schema#basic',
      target: { table, column },
      operator: 'In',
      values: [value],
      filterType: powerbi.models.FilterType.Basic,
    };
  }, []);

  // Apply filter to all visuals except the source
  const applyFilterToVisuals = useCallback(async (
    sourceVisualKey: VisualKey | null,
    filter: powerbi.models.IBasicFilter
  ) => {
    const visualsToFilter = Object.keys(visualInstancesRef.current).filter(
      key => key !== sourceVisualKey
    ) as VisualKey[];

    const filterPromises = visualsToFilter.map(async (visualKey) => {
      const targetVisual = visualInstancesRef.current[visualKey];
      if (targetVisual) {
        try {
          await (targetVisual as powerbi.Visual).setFilters([filter]);
        } catch (error) {
          console.error(`Error applying filter to ${visualKey} visual:`, error);
        }
      }
    });

    return Promise.all(filterPromises);
  }, []);

  // Handle visual selection events
  const handleVisualSelection = useCallback(async (sourceVisualKey: VisualKey, selection: any) => {
    // Early return if no data points were selected
    if (!selection.dataPoints || selection.dataPoints.length === 0) {
      return;
    }

    // Special handling for salesBySegment visual
    if (sourceVisualKey === 'salesBySegment') {
      const categories = ['Barba', 'Contoso', 'Fama', 'Natura', 'Palma', 'Pomum'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      const filter = createFilter('Product', 'Product', randomCategory);
      await applyFilterToVisuals(sourceVisualKey, filter);
      
      setSelectedCategory(randomCategory);
      return;
    }

    // Handle standard selection
    const selectedPoint = selection.dataPoints[0];
    
    if (!selectedPoint.identity || 
        !selectedPoint.identity.length || 
        !selectedPoint.identity[0].target) {
      console.warn('Selected data point does not contain the expected identity structure');
      return;
    }

    const identity = selectedPoint.identity[0];
    const targetTable = identity.target.table;
    const targetColumn = identity.target.column;
    let selectedValue = identity.equals;

    if (!selectedValue) {
      console.warn('No selected value found');
      return;
    }

    // Standardize the selected value
    selectedValue = getStandardizedValue(selectedValue);

    // Update state based on selection type
    if (targetTable === 'Product' && targetColumn === 'Product') {
      setSelectedCategory(String(selectedValue));
    } else if (targetTable === 'Store' && targetColumn === 'Store') {
      setSelectedCategory(String(selectedValue));
    } else if (targetTable === 'Product' && targetColumn === 'Segment') {
      setSelectedStore(String(selectedValue));
    } else {
      console.warn(`Unexpected selection type: ${targetTable}.${targetColumn}`);
      return;
    }

    // Apply filter to all other visuals
    const filter = createFilter(targetTable, targetColumn, selectedValue);
    await applyFilterToVisuals(sourceVisualKey, filter);
  }, [createFilter, applyFilterToVisuals, getStandardizedValue]);

  // Clear cross-filters when a selection is cleared
  const clearCrossFilters = useCallback(async (sourceVisualKey: VisualKey) => {
    // Determine visual types to manage filter behaviors
    const isStore = sourceVisualKey === 'category' || sourceVisualKey === 'salesByStore';
    const isSegment = sourceVisualKey === 'store' || sourceVisualKey === 'salesBySegment';

    // Reset filter state
    if (isStore) {
      setSelectedCategory('All');
    } else if (isSegment) {
      setSelectedStore('All');
    }

    // Get all visuals except the source
    const visualsToFilter = Object.keys(visualInstancesRef.current).filter(
      key => key !== sourceVisualKey
    ) as VisualKey[];

    // clear from target visuals
    const clearPromises = visualsToFilter.map(async (visualKey) => {
      const targetVisual = visualInstancesRef.current[visualKey];
      if (targetVisual) {
        try {
          await (targetVisual as powerbi.Visual).removeFilters();
        } catch (error) {
          console.error(`Error clearing filters from ${visualKey} visual:`, error);
        }
      }
    });

    await Promise.all(clearPromises);

    // Apply any remaining filters if needed
    if ((isStore && selectedStore !== 'All') || (isSegment && selectedCategory !== 'All')) {
      await applyFilters();
    }
  }, [selectedCategory, selectedStore]);

  // Embed a Power BI visual
  const embedVisualChart = useCallback((
    config: VisualConfig
  ) => {
    const { key, pageName, visualName } = config;
    const ref = visualRefs[key];
    
    if (!embedData || 
        !ref.current || 
        embeddedVisuals[key] || 
        !powerbiServiceRef.current) {
      return;
    }

    // Clear existing content
    ref.current.innerHTML = '';

    const embedConfig = {
      type: 'visual',
      tokenType: powerbi.models.TokenType.Embed,
      permissions: powerbi.models.Permissions.Read,
      embedUrl: embedData.embedUrl,
      accessToken: embedData.token,
      id: embedData.reportId,
      pageName,
      visualName,
      settings: {
        filterPaneEnabled: false,
      },
    };

    try {
      const visual = powerbiServiceRef.current.embed(ref.current, embedConfig);
      visualInstancesRef.current[key] = visual;

      visual.on('loaded', () => {
        // Add data selection event handler
        visual.on('dataSelected', (event) => {
          const selection = event.detail as { dataPoints: any[] };
          
          if (selection && selection.dataPoints && selection.dataPoints.length > 0) {
            handleVisualSelection(key, selection);
          } else {
            // If selection is cleared, remove cross-filters
            clearCrossFilters(key);
          }
        });
      });

      visual.on('error', (event) => console.error(`${key} Embed Error:`, event.detail));

      setEmbeddedVisuals(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error(`Error embedding ${key} visual:`, error);
    }
  }, [embedData, embeddedVisuals, handleVisualSelection, clearCrossFilters]);

  // Reset all filters
  const resetAllFilters = useCallback(async () => {
    setSelectedCategory('All');
    setSelectedStore('All');

    // clear from all visuals
    const clearPromises = Object.entries(visualInstancesRef.current).map(async ([_, visual]) => {
      if (visual) {
        try {
          await (visual as powerbi.Visual).removeFilters();
        } catch (error) {
          console.error('Error clearing filters:', error);
        }
      }
    });

    await Promise.all(clearPromises);
  }, []);

  // Set up double-click reset functionality
  const setupDoubleClickReset = useCallback(() => {
    Object.entries(visualRefs).forEach(([key, ref]) => {
      if (ref.current) {
        ref.current.addEventListener('dblclick', () => {
          resetAllFilters();
        });
      }
    });
  }, [resetAllFilters]);

  // Apply filters based on current selection state
  const applyFilters = useCallback(async () => {
    const filters: powerbi.models.IBasicFilter[] = [];

    if (selectedCategory !== 'All') {
      filters.push(createFilter('Store', 'Store', selectedCategory));
    }

    if (selectedStore !== 'All') {
      filters.push(createFilter('Product', 'Segment', selectedStore));
    }

    // Apply filters to all visuals
    const filterPromises = Object.entries(visualInstancesRef.current).map(async ([_, visual]) => {
      if (visual) {
        try {
          await (visual as powerbi.Visual).setFilters(filters);
        } catch (error) {
          console.error('Error applying filters:', error);
        }
      }
    });

    await Promise.all(filterPromises);
  }, [selectedCategory, selectedStore, createFilter]);

  // Filter handlers
  const toggleFilterCategory = useCallback((category: string) => {
    if (showFilters && activeFilterCategory === category) {
      setShowFilters(false);
    } else {
      setActiveFilterCategory(category);
      setShowFilters(true);
    }
  }, [showFilters, activeFilterCategory]);

  const handleCategoryChange = useCallback((store: string) => {
    setSelectedCategory(store);
    setShowFilters(false);
  }, []);

  const handleStoreChange = useCallback((segment: string) => {
    setSelectedStore(segment);
    setShowFilters(false);
  }, []);

  const clearFilters = useCallback(async () => {
    await resetAllFilters();
  }, [resetAllFilters]);

  // Embed visuals when token is available
  useEffect(() => {
    if (!embedData) return;
    
    // Embed all visuals
    visualConfigs.forEach(config => {
      embedVisualChart(config);
    });
  }, [embedData, embedVisualChart, visualConfigs]);

  // Set up double-click handlers after all visuals are embedded
  useEffect(() => {
    const allVisualsEmbedded = Object.values(embeddedVisuals).every(Boolean);
    
    if (allVisualsEmbedded) {
      setupDoubleClickReset();
    }
  }, [embeddedVisuals, setupDoubleClickReset]);

  // Apply filters when selections change
  useEffect(() => {
    if (embedData) {
      applyFilters();
    }
  }, [selectedCategory, selectedStore, embedData, applyFilters]);

  // Build sorted visual components
  const sortedVisuals = useMemo(() => {
    return visualOrder.map(visualId => {
      const config = visualConfigs.find(cfg => cfg.id === visualId);
      if (!config) return null;
      
      return {
        id: visualId,
        title: config.title,
        ref: visualRefs[config.key]
      };
    }).filter(Boolean);
  }, [visualOrder, visualConfigs]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6 mt-[67px]">
        <h1 className="text-4xl font-bold">Dashboard</h1>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {/* Store Filter */}
          <div className="relative">
            <button
              className={`flex items-center px-4 py-2 rounded-md shadow-sm focus:outline-none ${
                activeFilterCategory === 'Store' && showFilters
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              onClick={() => toggleFilterCategory('Store')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Store
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>

            {/* Store Filter Dropdown */}
            {showFilters && activeFilterCategory === 'Store' && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Select Store</h3>
                  {filterCategories[0].options.map((option) => (
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

          {/* Segment Filter */}
          <div className="relative">
            <button
              className={`flex items-center px-4 py-2 rounded-md shadow-sm focus:outline-none ${
                activeFilterCategory === 'Segment' && showFilters
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              onClick={() => toggleFilterCategory('Segment')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Segment
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>

            {/* Segment Filter Dropdown */}
            {showFilters && activeFilterCategory === 'Segment' && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <h3 className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Select Segment</h3>
                  {filterCategories[1].options.map((option) => (
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
          {(selectedCategory !== 'All' || selectedStore !== 'All') && (
            <button
              className="bg-red-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-600 focus:outline-none"
              onClick={clearFilters}
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Visual Grid with Drag and Drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SortableContext items={visualOrder} strategy={rectSortingStrategy}>
            {sortedVisuals.map(visual => (
              <SortableVisual 
                key={visual!.id} 
                id={visual!.id} 
                title={visual!.title}
              >
                <div
                  className="h-64 flex items-center justify-center bg-gray-100 rounded"
                  ref={visual!.ref}
                >
                  {!embedData && <p className="text-gray-500">Loading...</p>}
                </div>
              </SortableVisual>
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}