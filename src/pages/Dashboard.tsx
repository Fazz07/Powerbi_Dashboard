import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as powerbi from 'powerbi-client';
import { Filter, ChevronDown, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ModalWindow from '../components/ModalWindow';
// Ensure Report type matches definition in ModalWindow, especially Report['id'] type (string or number)
import { Report } from '../components/ModalWindow';
import { fetchDashboardConfig, saveDashboardConfig } from '../api/dashboardApi';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableVisual } from '../components/DraggableComponent';

const DEFAULT_VISUAL_ORDER: UnifiedVisualId[] = [
  'categoryVisual',
  'storeVisual',
  'salesByStoreVisual',
  'salesBySegmentVisual',
];

// Type Definitions
type VisualKey = 'category' | 'store' | 'salesByStore' | 'salesBySegment';
type VisualId = 'categoryVisual' | 'storeVisual' | 'salesByStoreVisual' | 'salesBySegmentVisual';
export type UnifiedVisualId = VisualId | string; // Allow dynamic IDs as strings

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

interface StaticVisualConfig {
  id: VisualId;
  key: VisualKey;
  title: string;
  pageName: string;
  visualName: string;
}

// Interface to represent any visual item (static or dynamic) for rendering/DnD
interface VisualItem {
    id: UnifiedVisualId;
    title: string;
    type: 'static' | 'dynamic';
    ref: React.RefObject<HTMLDivElement>;
    config?: StaticVisualConfig; // For static visuals
    report?: Report; // For dynamic visuals
}

// Holds instances of the *static* visuals, keyed by their VisualKey
interface VisualInstances {
  category?: powerbi.Embed;
  store?: powerbi.Embed;
  salesByStore?: powerbi.Embed;
  salesBySegment?: powerbi.Embed;
}

// Helper to generate dynamic visual ID (Assuming Report['id'] is string or number)
// Ensures the generated ID is always a string.
const getDynamicVisualId = (reportId: string | number): string => `dynamic-${reportId}`;

export default function Dashboard() {
  // --- Constants & Refs ---
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const powerbiServiceRef = useRef<powerbi.service.Service | null>(null);

  const { user } = useAuthStore();

  // Refs for static visuals' containers
  const visualRefs = {
    category: useRef<HTMLDivElement>(null),
    store: useRef<HTMLDivElement>(null),
    salesByStore: useRef<HTMLDivElement>(null),
    salesBySegment: useRef<HTMLDivElement>(null),
  };
  // Holds embed instances for static visuals, keyed by VisualKey
  const visualInstancesRef = useRef<VisualInstances>({});

  // Refs and instances for dynamic visuals' containers and embeds
  const dynamicVisualRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const dynamicVisualInstances = useRef<Record<string, powerbi.Embed>>({}); // Holds dynamic visual instances, keyed by dynamicId

  // --- State ---
  const [isLoadingConfig, setIsLoadingConfig] = useState(true); // New loading state
  const [isSavingConfig, setIsSavingConfig] = useState(false); // New saving state
  const [saveError, setSaveError] = useState<string | null>(null); // State for save errors
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('Store'); // Tracks which filter dropdown is open
  const [selectedCategory, setSelectedCategory] = useState<string>('All'); // Corresponds to 'Store' table filter
  const [selectedStore, setSelectedStore] = useState<string>('All'); // Corresponds to 'Product'/'Segment' table filter
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Report[]>([]); // Holds the selected dynamic reports' data

  const [visualOrder, setVisualOrder] = useState<UnifiedVisualId[]>(DEFAULT_VISUAL_ORDER);

  // Tracks whether each static visual has been embedded *once* to prevent re-embedding
  const [staticVisualsEmbedded, setStaticVisualsEmbedded] = useState<Record<VisualKey, boolean>>({
    category: false,
    store: false,
    salesByStore: false,
    salesBySegment: false,
  });

  // Tracks whether each static visual has finished rendering *data*
  const [visualRendered, setVisualRendered] = useState<Record<VisualKey, boolean>>({
    category: false,
    store: false,
    salesByStore: false,
    salesBySegment: false,
  });
  // Track dynamic visual rendering status if needed
  const [dynamicVisualsRendered, setDynamicVisualsRendered] = useState<Record<string, boolean>>({});


  // --- DnD Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Memoized Constants ---
  // Filter options for dropdowns
  const filterCategories: FilterCategory[] = useMemo(() => [
    {
      name: 'Store',
      key: 'Store', // Matches activeFilterCategory state
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
      key: 'Segment', // Matches activeFilterCategory state
      options: [
        { id: 'all-stores', label: 'All Stores', value: 'All' }, // 'All' value for clearing filter
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

  // Configuration for the static visuals
  const staticVisualConfigs: StaticVisualConfig[] = useMemo(() => [
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


  // --- Debounced Save Function ---
  const debouncedSave = useCallback(
   debounce(async (order: UnifiedVisualId[], reports: Report[]) => {
       if (!user) return; // Should not happen if called correctly
       setIsSavingConfig(true);
       setSaveError(null);
       console.log("Attempting to save dashboard config...");
       try {
           await saveDashboardConfig(order, reports);
           console.log("Dashboard config saved successfully.");
       } catch (error) {
           console.error("Failed to save dashboard config:", error);
           setSaveError("Failed to save layout changes.");
           // Optionally: revert local state or notify user more prominently
       } finally {
           setIsSavingConfig(false);
       }
   }, 1000), // Debounce saves by 1 second
   [user] // Recreate if user changes (login/logout)
  );

  // --- Effects ---

    // --- Load Config Effect ---
    useEffect(() => {
      if (!user) {
        // If user logs out while on dashboard, reset to default
        setVisualOrder(DEFAULT_VISUAL_ORDER);
        setSelectedReports([]);
        // Reset dynamic refs maybe?
        dynamicVisualRefs.current = {};
        setIsLoadingConfig(false);
        return;
      }

      const loadConfig = async () => {
        setIsLoadingConfig(true);
        console.log("Fetching user dashboard config...");
        try {
          const config = await fetchDashboardConfig();
          if (config) {
            console.log("User config loaded:", config);
            setVisualOrder(config.visualOrder);
            setSelectedReports(config.selectedDynamicReports);
            // Ensure refs exist for loaded dynamic reports
            config.selectedDynamicReports.forEach(report => {
                const dynamicId = getDynamicVisualId(report.id);
                if (!dynamicVisualRefs.current[dynamicId]) {
                    dynamicVisualRefs.current[dynamicId] = React.createRef<HTMLDivElement>();
                }
            });
          } else {
            console.log("No saved config found, using default layout.");
            setVisualOrder(DEFAULT_VISUAL_ORDER);
            setSelectedReports([]);
          }
        } catch (error) {
          console.error("Error loading dashboard config:", error);
          // Keep default layout on error
          setVisualOrder(DEFAULT_VISUAL_ORDER);
          setSelectedReports([]);
        } finally {
          setIsLoadingConfig(false);
        }
      };
      loadConfig();
    }, [user]); // Run when user changes (login)

  // Initialize PowerBI Service on mount
  useEffect(() => {
    powerbiServiceRef.current = new powerbi.service.Service(
      powerbi.factories.hpmFactory,
      powerbi.factories.wpmpFactory,
      powerbi.factories.routerFactory
    );
  }, []);

  // Fetch Embed Token on mount or when API URL changes
  useEffect(() => {
    async function fetchEmbedToken() {
      try {
        const response = await fetch(`${apiUrl}/getEmbedToken`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.token && data.embedUrl && data.reportId) {
          setEmbedData(data);
          console.log("Embed data fetched successfully.");
        } else {
          console.error('Missing token, embedUrl, or reportId in the API response');
        }
      } catch (error) {
        console.error('Error fetching embed token:', error);
        // TODO: Add user-facing error state/message
      }
    }
    fetchEmbedToken();
  }, [apiUrl]);

  // --- Helper Functions ---

  // Example standardization logic (adjust as needed)
  const getStandardizedValue = useCallback((selectedValue: string): string => {
        const valueMap: Record<string, string> = {
      'Pirum': 'Leo', 'OneNote': 'Fama', 'Publisher': 'Abbas', 'SharePoint': 'Barba',
      'Kaizala': 'Leo', 'PowerApps': 'Palma', 'Access': 'Aliqui', 'Word': 'Contoso',
      'Exchange': 'Leo', 'Planner': 'Fama',
    };
    const msProducts = [
      'Stream', 'Power BI', 'PowerPoint', 'Teams', 'Visio', 'Outlook', 'Excel', 'Skype', 'Forms'
    ];
    if (msProducts.includes(selectedValue)) {
      const options = ['Barba', 'Contoso', 'Fama', 'Leo', 'Natura', 'Palma', 'Pomum'];
      return options[Math.floor(Math.random() * options.length)];
    }
    return valueMap[selectedValue] || selectedValue;
  }, []);

  // --- Drag and Drop Handler ---
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setVisualOrder((items) => {
        const oldIndex = items.findIndex(id => id === active.id);
        const newIndex = items.findIndex(id => id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Trigger debounced save after state update
        debouncedSave(newOrder, selectedReports); // Use current selectedReports

        return newOrder;
      });
    }
  }, [selectedReports, debouncedSave]); // Add dependencies


  // ADD THIS: Runs ONCE on mount to clear stale data
  useEffect(() => {
    console.log("Dashboard mounted. Clearing potentially stale window/store data.");
    delete (window as any).__powerBIData;
    delete (window as any).__powerBIVisualInstances;
    // delete (window as any).powerbi; // Optional: depends if you want to reset the service instance too
    useAuthStore.getState().setVisualsLoaded(false); // Reset loading state
    useAuthStore.getState().setMetrics({}); // Clear metrics if dashboard doesn't set them
     // Clear specific dashboard parse states if necessary
    useAuthStore.getState().setParsedComponent('none');
    useAuthStore.getState().setParsedComponentTwo('none');
  }, []);

  // --- Filtering Logic ---

  /**
   * Creates a Power BI Basic Filter object.
   * Ensures value is provided and returns a non-functional filter structure if inputs are invalid.
   */
  const createFilter = useCallback((table: string, column: string, value: string): powerbi.models.IBasicFilter => {
    if (!table || !column || value === undefined || value === null) {
        console.error("Cannot create filter with invalid parameters:", { table, column, value });
         return {
            $schema: 'http://powerbi.com/product/schema#basic',
            target: { table: '_invalid_', column: '_invalid_' },
            operator: 'In',
            values: [],
            filterType: powerbi.models.FilterType.Basic,
         };
    }
    return {
      $schema: 'http://powerbi.com/product/schema#basic',
      target: { table, column },
      operator: 'In',
      values: [value], // Value must be in an array for 'In' operator
      filterType: powerbi.models.FilterType.Basic,
    };
  }, []);

  /**
   * Applies filters based on the current state (selectedCategory, selectedStore) to ALL visuals.
   * Called when dropdown selections change or after a clear operation requires re-filtering.
   */
  const applyFilters = useCallback(async () => {
    if (!embedData) return;

    const filtersToApply: powerbi.models.IBasicFilter[] = [];
    if (selectedCategory !== 'All') {
      filtersToApply.push(createFilter('Store', 'Store', selectedCategory));
    }
    if (selectedStore !== 'All') {
      filtersToApply.push(createFilter('Product', 'Segment', selectedStore));
    }

    const allInstances: Record<UnifiedVisualId, powerbi.Embed> = {
        ...visualInstancesRef.current,
        ...dynamicVisualInstances.current
    };

    console.log(`Applying ${filtersToApply.length} filters based on state:`, filtersToApply);

    const filterPromises = Object.values(allInstances).map(async (visual) => {
      if (visual && 'setFilters' in visual) {
        try {
          // Calling setFilters with array (empty or populated) replaces existing basic filters
          await (visual as powerbi.Visual).setFilters(filtersToApply);
        } catch (error) {
          console.warn(`Warn: Error applying state filters to a visual:`, error);
        }
      }
    });

    try {
        await Promise.all(filterPromises);
    } catch(error) {
        console.error("Error during batch state filter application:", error);
    }
  }, [selectedCategory, selectedStore, createFilter, embedData]); // Include embedData dependency

  /**
   * Applies a *single* filter object to all visuals EXCEPT the source visual.
   * Called when a visual selection triggers a cross-filter.
   */
  const applyFilterToVisuals = useCallback(async (
    sourceVisualId: UnifiedVisualId | null,
    filter: powerbi.models.IBasicFilter | null // Allow null filter for safety
  ) => {
      if (!filter || !filter.target || !('table' in filter.target) || filter.target.table === '_invalid_') {
          console.log("Skipping application of invalid/null filter.");
          return; // Don't proceed if filter is invalid
      }

      console.log(`Applying filter from source ${sourceVisualId || 'unknown'} to other visuals:`, filter);

      const allInstances: Record<UnifiedVisualId, powerbi.Embed> = {
          ...visualInstancesRef.current,
          ...dynamicVisualInstances.current
      };

      const filterPromises = Object.entries(allInstances)
        .filter(([id, _]) => id !== sourceVisualId) // Exclude the source visual
        .map(async ([id, targetVisual]) => {
            if (targetVisual && 'setFilters' in targetVisual) {
                try {
                    // Apply the single filter (as an array)
                    await (targetVisual as powerbi.Visual).setFilters([filter]);
                } catch (error) {
                    console.error(`Error applying single filter to visual ${id}:`, error);
                }
            }
        });

      try {
         await Promise.all(filterPromises);
      } catch(error) {
         console.error("Error during batch single filter application:", error);
      }
  }, []); // No external dependencies needed


  /**
   * Handles the 'dataSelected' event from any Power BI visual (static or dynamic).
   * Determines the selected dimension/value and triggers state updates and/or cross-filtering.
   */
  const handleVisualSelection = useCallback(async (sourceVisualId: UnifiedVisualId, selection: any) => {
      // Determine if the source is static or dynamic
      const isStaticSource = staticVisualConfigs.some(cfg => cfg.id === sourceVisualId);
      const sourceConfig = isStaticSource ? staticVisualConfigs.find(cfg => cfg.id === sourceVisualId) : null;
      const sourceKey = sourceConfig?.key;

      console.log(`Handling selection from ${isStaticSource ? 'Static' : 'Dynamic'} visual: ${sourceVisualId}`);

      // --- Common Data Extraction Logic ---
      if (!selection.dataPoints || selection.dataPoints.length === 0) {
          console.log('Selection event has no data points.');
          return;
      }
      const selectedPoint = selection.dataPoints[0];
      // Validate the expected structure of the selection identity
      if (!selectedPoint.identity || !selectedPoint.identity.length || !selectedPoint.identity[0].target) {
          console.warn('Selection data point missing expected identity structure.');
          return;
      }
      const identity = selectedPoint.identity[0];
      if (!identity.target || !identity.target.table || !identity.target.column) {
           console.warn('Selection identity missing target table or column.');
           return;
      }
      const targetTable: string = identity.target.table;
      const targetColumn: string = identity.target.column;
      let selectedValue: any = identity.equals; // Can be string, number, boolean, etc.

      if (selectedValue === undefined || selectedValue === null) {
          console.warn('No selected value (identity.equals) found in selection.');
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
      if (selectedValue === "Stream" || selectedValue === "Power BI" || selectedValue === "PowerPoint" || selectedValue === "Teams" || selectedValue === "Visio" || selectedValue === "Outlook" || selectedValue === "Excel" || selectedValue === "Skype" || selectedValue === "Forms") {
        const options = ['Barba', 'Contoso', 'Fama', 'Leo', 'Natura','Palma', 'Pomum'];
        selectedValue = options[Math.floor(Math.random() * options.length)];
        console.log('Replaced with random value:', selectedValue);
      }

      // Convert selected value to string for filtering (createFilter expects string)
      const filterValue = String(selectedValue);
      let filterToApply: powerbi.models.IBasicFilter | null = null;

      // --- Logic specific to SOURCE type ---
      if (isStaticSource && sourceKey) {
          // --- Static Visual Source Logic ---
          console.log(`Static source (${sourceKey}) selected: ${targetTable}.${targetColumn} = ${filterValue}`);

          // Example: Special handling for 'salesBySegment' visual (if needed)
          if (sourceKey === 'salesBySegment') {
              const categories = ['Barba', 'Contoso', 'Fama', 'Natura', 'Palma', 'Pomum'];
              const randomCategory = categories[Math.floor(Math.random() * categories.length)];
              filterToApply = createFilter('Product', 'Product', randomCategory);
              setSelectedCategory(randomCategory); // Update state if this random selection represents category
              console.log(`Applying random category filter from salesBySegment: ${randomCategory}`);
          } else {
              // Standard static visual filtering
              let standardizedValue = getStandardizedValue(filterValue); // Apply standardization rules

              // Update state IF the selection corresponds to managed filters ('Store' or 'Segment')
              if (targetTable === 'Product' && targetColumn === 'Product') {
                  setSelectedCategory(standardizedValue); // Map Product selection to Category state
                  filterToApply = createFilter(targetTable, targetColumn, standardizedValue);
              } else if (targetTable === 'Store' && targetColumn === 'Store') {
                   setSelectedCategory(standardizedValue); // Map Store selection to Category state
                   filterToApply = createFilter(targetTable, targetColumn, standardizedValue);
              } else if (targetTable === 'Product' && targetColumn === 'Segment') {
                  setSelectedStore(standardizedValue); // Map Segment selection to Store state
                  filterToApply = createFilter(targetTable, targetColumn, standardizedValue);
              } else {
                  console.warn(`Unhandled selection from static visual ${sourceKey}: ${targetTable}.${targetColumn}`);
                  // Option: Create a direct filter even if state isn't updated for this dimension
                  // filterToApply = createFilter(targetTable, targetColumn, filterValue); // Use non-standardized value?
              }
          }
      } else {
          // --- Dynamic Visual Source Logic ---
          console.log(`Dynamic source (${sourceVisualId}) selected: ${targetTable}.${targetColumn} = ${filterValue}`);

          // Apply same logic as static: Update shared state if selection matches known dimensions.
          if (targetTable === 'Product' && targetColumn === 'Product') {
              // Assuming dynamic visual's 'Product' maps to Category state. No standardization applied by default.
              setSelectedCategory(filterValue);
              filterToApply = createFilter(targetTable, targetColumn, filterValue);
              console.log(`Dynamic selection updated Category state to: ${filterValue}`);
          } else if (targetTable === 'Store' && targetColumn === 'Store') {
               // Assuming dynamic visual's 'Store' maps to Category state.
               setSelectedCategory(filterValue);
               filterToApply = createFilter(targetTable, targetColumn, filterValue);
               console.log(`Dynamic selection updated Category state via Store to: ${filterValue}`);
          } else if (targetTable === 'Product' && targetColumn === 'Segment') {
              // Assuming dynamic visual's 'Segment' maps to Store state.
              setSelectedStore(filterValue);
              filterToApply = createFilter(targetTable, targetColumn, filterValue);
              console.log(`Dynamic selection updated Store (Segment) state to: ${filterValue}`);
          } else {
              // Selection from dynamic visual doesn't match known managed dimensions.
              console.warn(`Unhandled selection from dynamic visual ${sourceVisualId}: ${targetTable}.${targetColumn}. Applying filter directly.`);
              // Apply the filter directly without updating shared state.
              filterToApply = createFilter(targetTable, targetColumn, filterValue);
          }
      }

      // --- Apply the determined filter (if any) to other visuals ---
      if (filterToApply) {
          await applyFilterToVisuals(sourceVisualId, filterToApply);
      } else {
          console.log("No filter generated for this selection.");
      }

  }, [staticVisualConfigs, createFilter, applyFilterToVisuals, getStandardizedValue, setSelectedCategory, setSelectedStore]); // Added state setters


  /**
   * Handles the clearing of a selection on a Power BI visual.
   * Resets the corresponding filter state (if source is static and known)
   * Removes filters from all other visuals.
   * Re-applies any remaining active filters based on the updated state.
   */
  const clearCrossFilters = useCallback(async (sourceVisualId: UnifiedVisualId) => {
        const isStaticSource = staticVisualConfigs.some(cfg => cfg.id === sourceVisualId);
        const sourceConfig = isStaticSource ? staticVisualConfigs.find(cfg => cfg.id === sourceVisualId) : null;
        const sourceKey = sourceConfig?.key;

        console.log(`Clearing cross-filters triggered by ${isStaticSource ? 'Static' : 'Dynamic'} visual: ${sourceVisualId}`);

        let needsRefilter = false; // Flag to check if applyFilters needs to run at the end

        if (isStaticSource && sourceKey) {
            // --- Static Source Clear Logic: Reset corresponding state ---
            const isStoreRelated = sourceKey === 'category' || sourceKey === 'salesByStore';
            const isSegmentRelated = sourceKey === 'store' || sourceKey === 'salesBySegment';

            if (isStoreRelated && selectedCategory !== 'All') {
                console.log(`Static clear (${sourceKey}) resetting Category filter.`);
                setSelectedCategory('All');
                needsRefilter = selectedStore !== 'All'; // Check if Store filter remains active
            } else if (isSegmentRelated && selectedStore !== 'All') {
                console.log(`Static clear (${sourceKey}) resetting Store (Segment) filter.`);
                setSelectedStore('All');
                needsRefilter = selectedCategory !== 'All'; // Check if Category filter remains active
            } else {
                // Source didn't correspond to an active filter, but check if OTHER filters need re-applying
                 needsRefilter = selectedCategory !== 'All' || selectedStore !== 'All';
            }
        } else {
             // --- Dynamic Source Clear Logic: Don't reset shared state ---
             // Just determine if *any* shared state filter is active, requiring a refilter after clearing.
             console.log(`Dynamic clear (${sourceVisualId}). Determining if refilter needed based on current state.`);
             needsRefilter = selectedCategory !== 'All' || selectedStore !== 'All';
        }

        // --- Common Filter Removal Logic ---
        const allInstances: Record<UnifiedVisualId, powerbi.Embed> = {
            ...visualInstancesRef.current,
            ...dynamicVisualInstances.current
        };

        console.log("Removing filters from non-source visuals...");
        const clearPromises = Object.entries(allInstances)
            .filter(([id, _]) => id !== sourceVisualId) // Don't clear the source visual itself
            .map(async ([id, targetVisual]) => {
            if (targetVisual && 'removeFilters' in targetVisual) {
                try {
                    await (targetVisual as powerbi.Visual).removeFilters();
                } catch (error) {
                    console.error(`Error clearing filters from visual ${id}:`, error);
                }
            }
        });

        try {
            await Promise.all(clearPromises);
            console.log("Filters removed from non-source visuals.");
        } catch (error) {
            console.error("Error during batch filter removal:", error);
        }


        // --- Re-apply remaining filters based on updated state if needed ---
        if (needsRefilter) {
            console.log("Re-applying filters based on current state after clear.");
            await applyFilters(); // Re-apply based on selectedCategory/selectedStore state
        } else {
            console.log("No remaining filters to re-apply.");
        }

  }, [selectedCategory, selectedStore, staticVisualConfigs, applyFilters, setSelectedCategory, setSelectedStore]); // Added state setters


  /**
   * Resets all filters: sets state to 'All' and removes filters from all visuals.
   */
  const resetAllFilters = useCallback(async () => {
    setSelectedCategory('All');
    setSelectedStore('All');

    const allInstances: Record<UnifiedVisualId, powerbi.Embed> = {
        ...visualInstancesRef.current,
        ...dynamicVisualInstances.current
    };

    const clearPromises = Object.values(allInstances).map(async (visual) => {
      if (visual && 'removeFilters' in visual) {
        try {
          await (visual as powerbi.Visual).removeFilters();
        } catch (error) {
          console.error('Error clearing filters on reset:', error);
        }
      }
    });
    try {
        await Promise.all(clearPromises);
        console.log('All filters reset successfully.');
    } catch(error) {
         console.error('Error during batch filter reset:', error);
    }
  }, []); // No dependencies needed for state setters


  // --- Embedding Logic ---

  /**
   * Embeds a single static visual based on its configuration.
   */
  const embedStaticVisual = useCallback((config: StaticVisualConfig) => {
    const { id, key, pageName, visualName } = config;
    const ref = visualRefs[key];

    // Prevent embedding if conditions not met
    if (!embedData || !ref.current || staticVisualsEmbedded[key] || !powerbiServiceRef.current) {
       // Add detailed logging here
       console.log(`Skipping static embed for ${key}: EmbedData?`, !!embedData, `Ref?`, !!ref?.current, `AlreadyEmbedded?`, !!staticVisualsEmbedded[key], `Service?`, !!powerbiServiceRef.current);
      return;
    }

    console.log(`Attempting to embed static visual: ${key} (${id})`);
    ref.current.innerHTML = ''; // Clear previous content

    const embedConfig: powerbi.IVisualEmbedConfiguration = {
      type: 'visual',
      tokenType: powerbi.models.TokenType.Embed,
      permissions: powerbi.models.Permissions.Read,
      embedUrl: embedData.embedUrl,
      accessToken: embedData.token,
      id: embedData.reportId, // The Report ID from embedData
      pageName: pageName,
      visualName: visualName,
      settings: { filterPaneEnabled: false },
    };

    try {
      const visual = powerbiServiceRef.current.embed(ref.current, embedConfig);
      visualInstancesRef.current[key] = visual; // Store instance by key

      visual.on('loaded', () => {
        console.log(`Static visual loaded: ${key}`);
        // Attach data selection handler after load
        visual.on('dataSelected', (event) => {
          const selection = event.detail as { dataPoints: any[] };
          if (selection && selection.dataPoints && selection.dataPoints.length > 0) {
            handleVisualSelection(config.id, selection); // Pass static ID
          } else {
            // Selection cleared on this static visual
            clearCrossFilters(config.id); // Pass static ID
          }
        });
      });

      visual.on('rendered', () => {
        console.log(`Static visual rendered: ${key}`);
        setVisualRendered(prev => ({ ...prev, [key]: true }));
      });

      visual.on('error', (event) => {
         console.error(`Static visual embed error (${key} - ${id}):`, event.detail);
         // TODO: Handle embed errors
      });

      // Mark as embedded to prevent re-embedding on re-renders
      setStaticVisualsEmbedded(prev => ({ ...prev, [key]: true }));

    } catch (error) {
      console.error(`Error initiating embed for static visual ${key} (${id}):`, error);
    }
  // Removed staticVisualsEmbedded from deps, embedding attempt should be controlled by the calling effect
  }, [embedData, handleVisualSelection, clearCrossFilters]);


  /**
   * Embeds a single dynamic visual based on its Report data.
   */
  const embedDynamicVisual = useCallback((report: Report) => {
        const dynamicId = getDynamicVisualId(report.id);
        const ref = dynamicVisualRefs.current[dynamicId];

        // Prevent embedding if conditions not met
        // Check if instance already exists
        if (!embedData || !powerbiServiceRef.current || !ref?.current || dynamicVisualInstances.current[dynamicId]) {
             console.log(`Skipping dynamic embed for ${dynamicId}: EmbedData?`, !!embedData, `Service?`, !!powerbiServiceRef.current, `Ref?`, !!ref?.current, `InstanceExists?`, !!dynamicVisualInstances.current[dynamicId]);
            return;
        }

        console.log(`Attempting to embed dynamic visual: ${report.title} (${dynamicId})`);
        ref.current.innerHTML = ''; // Clear previous content

        // --- Determine Page and Visual Name based on Title (CRITICAL: UPDATE THIS MAPPING) ---
        let pageName = '';
        let visualName = '';
        switch (report.title) {
            case "Category Breakdown":
                pageName = 'ReportSection998e2850a99cabad87e8';
                visualName = '3a28c5fee26bd29ff352';
                break;
            case "Store Breakdown":
                pageName = 'ReportSection998e2850a99cabad87e8';
                visualName = 'd55aa7aa40745de10d55';
                break;
            case "Revenue Trends":
                pageName = 'ReportSection4b3fbaa7dd7908d906d9';
                visualName = '3a28c5fee26bd29ff352';
                break;
            // Add cases for ALL possible dynamic reports
            default:
                console.warn(`No embed configuration defined for dynamic report title: ${report.title}. Skipping embed.`);
                // render a placeholder in the container
                if(ref.current) { // Check ref before assigning innerHTML
                   ref.current.innerHTML = `<div class="p-4 text-center text-red-600">Configuration missing for "${report.title}"</div>`;
                }
                return; // Stop embedding if config is missing
        }
        // --- End Configuration Mapping ---

        const embedConfig: powerbi.IVisualEmbedConfiguration = {
            type: 'visual',
            tokenType: powerbi.models.TokenType.Embed,
            permissions: powerbi.models.Permissions.Read,
            embedUrl: embedData.embedUrl,
            accessToken: embedData.token,
            id: embedData.reportId, // Assuming all visuals come from the SAME base report ID defined in embedData
            pageName: pageName,
            visualName: visualName,
            settings: { filterPaneEnabled: false },
        };

        try {
            const visual = powerbiServiceRef.current.embed(ref.current, embedConfig);
            dynamicVisualInstances.current[dynamicId] = visual; // Store instance by dynamicId

            visual.on('loaded', () => {
                 console.log(`Dynamic visual loaded: ${dynamicId}`);
                 // Attach data selection handler after load
                 visual.on('dataSelected', (event) => {
                    const selection = event.detail as { dataPoints: any[] };
                     if (selection && selection.dataPoints && selection.dataPoints.length > 0) {
                        handleVisualSelection(dynamicId, selection); // Pass dynamic ID
                    } else {
                        // Selection cleared on this dynamic visual
                        clearCrossFilters(dynamicId); // Pass dynamic ID
                    }
                 });
            });

            visual.on('rendered', () => {
                console.log(`Dynamic visual rendered: ${dynamicId}`);
                // Update dynamic render state if needed
                setDynamicVisualsRendered(prev => ({ ...prev, [dynamicId]: true }));
            });

            visual.on('error', (event) => {
                 console.error(`Dynamic visual embed error (${dynamicId} - ${report.title}):`, event.detail);
                 // TODO: Handle embed errors
                 // Maybe remove instance? delete dynamicVisualInstances.current[dynamicId];
            });

        } catch (error) {
            console.error(`Error initiating embed for dynamic visual ${dynamicId} (${report.title}):`, error);
             if(ref.current) {
                 ref.current.innerHTML = `<div class="p-4 text-center text-red-600">Error embedding "${report.title}"</div>`;
             }
        }
   // Removed instance check from dependencies, calling effect controls if embed is attempted
  }, [embedData, handleVisualSelection, clearCrossFilters]);


  // --- Interaction Setup ---

  /**
   * Sets up double-click listeners on static visual containers to reset all filters.
   * Returns a cleanup function to remove listeners.
   */
  const setupDoubleClickReset = useCallback(() => {
    let cleanupFunctions: Array<() => void> = []; // Store cleanup functions for each listener

    Object.entries(visualRefs).forEach(([key, ref]) => {
      const currentRef = ref.current;
      if (currentRef) {
          // Define the handler for this specific visual container
          const handleDoubleClick = () => {
            console.log(`Double click detected on static visual container: ${key}, resetting filters.`);
            resetAllFilters();
          };

          // Remove potentially existing listener before adding a new one
          currentRef.removeEventListener('dblclick', handleDoubleClick);
          currentRef.addEventListener('dblclick', handleDoubleClick);

          // Add a cleanup function for this specific listener to the array
          cleanupFunctions.push(() => {
              if (currentRef) { // Check ref again in cleanup closure
                  currentRef.removeEventListener('dblclick', handleDoubleClick);
              }
          });
      }
    });

    // Return a single function that executes all collected cleanup functions
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [resetAllFilters]); // Depends only on resetAllFilters callback

  // --- Filter UI Handlers ---
  const toggleFilterCategory = useCallback((category: string) => {
    if (showFilters && activeFilterCategory === category) {
      setShowFilters(false); // Close if clicking the active category again
    } else {
      setActiveFilterCategory(category); // Set the active category
      setShowFilters(true); // Open the dropdown
    }
  }, [showFilters, activeFilterCategory]);

  const handleCategoryChange = useCallback((storeValue: string) => {
    setSelectedCategory(storeValue);
    setShowFilters(false); // Close dropdown after selection
  }, []); // No dependency needed for setter

  const handleStoreChange = useCallback((segmentValue: string) => {
    setSelectedStore(segmentValue);
    setShowFilters(false); // Close dropdown after selection
  }, []); // No dependency needed for setter

  // Clear button handler
  const clearFilters = useCallback(async () => {
    await resetAllFilters();
  }, [resetAllFilters]);

  // --- Modal Handlers ---
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  /**
   * Handles adding new reports from the modal.
   * Updates selected reports state, adds new visuals to the order, and creates refs.
   */
  // --- Add Report Handler (Modify to trigger save) ---
   const handleAddReports = useCallback((newlySelected: Report[]) => {
        const uniqueNewReports = newlySelected.filter(
            (newReport) => !selectedReports.some((existingReport) => String(existingReport.id) === String(newReport.id))
        );

        if (uniqueNewReports.length > 0) {
            const updatedReports = [...selectedReports, ...uniqueNewReports];
            const newDynamicIds = uniqueNewReports.map(report => getDynamicVisualId(report.id));
            const updatedOrder = [...visualOrder, ...newDynamicIds];

            // Create refs first
            newDynamicIds.forEach(id => {
                if (!dynamicVisualRefs.current[id]) {
                    dynamicVisualRefs.current[id] = React.createRef<HTMLDivElement>();
                }
            });

            // Update state
            setSelectedReports(updatedReports);
            setVisualOrder(updatedOrder);

            // Trigger save immediately (or debounce if preferred)
            // Using immediate save here for simplicity after adding
             saveDashboardConfig(updatedOrder, updatedReports)
               .then(() => console.log("Config saved after adding reports."))
               .catch(err => console.error("Error saving after adding reports:", err));
             // Or use: debouncedSave(updatedOrder, updatedReports);

        } else {
            console.log("No new unique reports selected.");
        }

        closeModal();
   }, [selectedReports, visualOrder]); // Removed debouncedSave if saving immediately


     // --- Rendering Helpers ---

  /**
   * Helper function to get the necessary data (id, title, ref, type) for a visual
   * based on its ID (static or dynamic) present in the visualOrder state.
   */
  const getVisualItemData = useCallback((id: UnifiedVisualId): VisualItem | null => {
    // Check if it's a known static visual ID
    const staticConfig = staticVisualConfigs.find(cfg => cfg.id === id);
    if (staticConfig) {
        return {
            id: staticConfig.id, title: staticConfig.title, type: 'static',
            ref: visualRefs[staticConfig.key], config: staticConfig
        };
    }

    // Check if it's a dynamic visual ID (starts with 'dynamic-')
    if (typeof id === 'string' && id.startsWith('dynamic-')) {
        const reportIdStr = id.substring('dynamic-'.length);

        // Find the corresponding report data in selectedReports
        // Compare IDs as strings for robustness against number/string type differences
        const report = selectedReports.find(r => String(r.id) === reportIdStr);

        if (report) {
            // Ensure the ref exists for this dynamic visual (should have been created by handleAddReports/embed effect)
            if (!dynamicVisualRefs.current[id]) {
                console.warn(`Ref for dynamic visual ${id} was missing during render prep. Creating now.`);
                dynamicVisualRefs.current[id] = React.createRef<HTMLDivElement>();
            }
             return {
                 id: id, title: report.title, type: 'dynamic',
                 ref: dynamicVisualRefs.current[id], report: report
             };
        }
    }

    // ID not found or doesn't match known patterns
    console.warn(`Could not find visual data for ID during render: ${id}`);
    return null;

}, [staticVisualConfigs, selectedReports]); // Depends on static configs and selected dynamic reports data


 /**
  * Memoized array of VisualItem objects, ordered according to visualOrder state.
  * Used directly in the rendering loop.
  */
 const visualItemsForRender: VisualItem[] = useMemo(() => {
      return visualOrder
          .map(id => getVisualItemData(id)) // Get data for each ID in the current order
          .filter((item): item is VisualItem => item !== null); // Filter out any null results (safety check)
 }, [visualOrder, getVisualItemData]); // Re-calculate when order changes or data retrieval logic changes

  // --- Core Effects for Embedding and Interaction ---

  // Effect to Embed STATIC visuals based on current render order
  useEffect(() => {
    // Wait until embed token is ready AND config loading is finished
    if (!embedData || isLoadingConfig) {
      console.log("Static embed waiting: EmbedData?", !!embedData, "Config Loading?", isLoadingConfig);
      return;
    }

    console.log("Checking static visuals in current render order for embedding...");

    // Iterate over the visuals currently determined to be rendered based on visualOrder
    visualItemsForRender.forEach(item => {
        // Only try to embed visuals of type 'static' that have config
        if (item.type === 'static' && item.config) {
            const config = item.config;
            const key = config.key;

            // Check if this specific static visual hasn't been embedded yet
            if (!staticVisualsEmbedded[key]) {
                console.log(`Attempting embed for static visual in order: ${key} (${config.id})`);
                // Call the embed function (which checks ref.current internally)
                embedStaticVisual(config);
            } else {
               // console.log(`Static visual ${key} already marked as embedded.`); // Optional logging
            }
        }
    });

  // Dependencies: Re-run this check if embed data, loading status, items to render,
  // the embed function itself changes. Removed staticVisualsEmbedded dependency.
  }, [
      embedData,
      isLoadingConfig,
      visualItemsForRender, // Depends on visualOrder, selectedReports, getVisualItemData
      embedStaticVisual,    // Depends on its own dependencies
      // staticVisualsEmbedded // REMOVED
  ]);

  // Effect to Embed DYNAMIC visuals
  useEffect(() => {
    // Wait for embed data AND config loading to finish
    if (!embedData || isLoadingConfig || selectedReports.length === 0) {
        console.log("Dynamic embed waiting: EmbedData?", !!embedData, "Config Loading?", isLoadingConfig, "Reports?", selectedReports.length);
        return;
    }
    console.log("Checking dynamic visuals for embedding...");

    // Ensure refs exist (safe check)
    selectedReports.forEach(report => {
        const dynamicId = getDynamicVisualId(report.id);
        if (!dynamicVisualRefs.current[dynamicId]) {
            console.warn(`Ref missing for dynamic visual ${dynamicId} during embed effect, creating.`);
            dynamicVisualRefs.current[dynamicId] = React.createRef<HTMLDivElement>();
        }
    });

    // Attempt embed - only if instance doesn't exist yet
    selectedReports.forEach(report => {
        const dynamicId = getDynamicVisualId(report.id);
        if (!dynamicVisualInstances.current[dynamicId]) {
            embedDynamicVisual(report);
        } else {
           // console.log(`Dynamic visual ${dynamicId} already has an instance.`); // Optional logging
        }
    });

  // Dependencies: Re-run if embed data, loading status, reports list, or embed function changes.
  }, [embedData, isLoadingConfig, selectedReports, embedDynamicVisual]);

    // Effect for applying filters (runs when filters change or after load)
    useEffect(() => {
      // Only apply filters once embed is possible AND config is loaded
      if (embedData && !isLoadingConfig) {
          console.log("Applying filters due to state change (selectedCategory/selectedStore/load).");
          applyFilters();
      }
    // Dependencies: Filter state, embed readiness, loading status, and the apply function itself
    }, [selectedCategory, selectedStore, embedData, isLoadingConfig, applyFilters]);


  // --- Data Exposure & Loading State Effects ---

  // Effect for Data Exposure
  useEffect(() => {
    // Wait for config load before exposing data
    if (isLoadingConfig) {
        console.log("Data exposure waiting for config load.");
        return;
    }

    // Check if embed data exists and if there's at least one visual instance
    const anyStaticInstance = Object.values(visualInstancesRef.current).some(v => !!v);
    const anyDynamicInstance = Object.values(dynamicVisualInstances.current).some(v => !!v);

    // Only expose if embed data exists AND there's something embedded
    if (embedData && (anyStaticInstance || anyDynamicInstance)) {
        try {
            const powerBIData = {
                pageName: 'dashboard',
                reportId: embedData.reportId,
                filters: [
                    { table: 'Store', column: 'Store', value: selectedCategory },
                    { table: 'Product', column: 'Segment', value: selectedStore }
                ],
                // Base exposure on visualItemsForRender to reflect current layout
                visuals: visualItemsForRender.map(item => {
                    const visualInstance = item.type === 'static'
                      ? visualInstancesRef.current[item.config!.key]
                      : dynamicVisualInstances.current[item.id];
                    // Determine the actual visual name used (best effort)
                    const visualNameUsed = item.type === 'static'
                      ? item.config!.visualName
                      : (visualInstance as any)?.config?.visualName || 'unknown_dynamic'; // Check instance config if possible

                    return {
                        name: visualNameUsed,
                        key: item.type === 'static' ? item.config!.key : item.id,
                        id: item.id,
                        title: item.title,
                        type: item.type,
                        data: { // Example data structure
                            visualType: item.type === 'static' ? item.config!.key : item.report?.title || 'unknown_dynamic_report',
                            visible: !!visualInstance // Is an instance currently stored?
                        }
                    };
                })
            };

            (window as any).__powerBIData = powerBIData;
            (window as any).__powerBIVisualInstances = { ...visualInstancesRef.current, ...dynamicVisualInstances.current };
            if (powerbiServiceRef.current) {
                (window as any).powerbi = powerbiServiceRef.current;
            }
            console.log('Dashboard: PowerBI data exposed to window:', powerBIData);

        } catch (error) {
            console.error('Dashboard: Error exposing PowerBI data to window:', error);
        }
    } else {
         console.log("Data exposure skipped: EmbedData?", !!embedData, "Instances?", anyStaticInstance || anyDynamicInstance);
    }

    // Cleanup - remains the same
    return () => {
      console.log('Dashboard data exposure cleanup.');
      // Clear window properties if necessary, though mount effect should handle it
      delete (window as any).__powerBIData;
      delete (window as any).__powerBIVisualInstances;
      // delete (window as any).powerbi;
    };
  // Dependencies: Re-run when data/filters/visuals/loading change
  }, [
      embedData, isLoadingConfig, selectedCategory, selectedStore,
      staticVisualConfigs, selectedReports, visualItemsForRender // visualItemsForRender covers visualOrder changes
  ]);


  // Effect for global loading state
  useEffect(() => {
    // Wait for config load before determining final load state
    if (isLoadingConfig) {
        useAuthStore.getState().setVisualsLoaded(false);
        console.log("Visual loading state: Waiting for config load.");
        return;
    }

    // Config loaded, now check renders based on current visualOrder
    // Only check static visuals that are *supposed* to be in the current order
    const staticVisualsInCurrentOrder = staticVisualConfigs.filter(cfg => visualOrder.includes(cfg.id));
    const allStaticInOrderRendered = staticVisualsInCurrentOrder.length === 0 || staticVisualsInCurrentOrder.every(config => visualRendered[config.key]);

    // Check dynamic visuals based on selectedReports
    const allDynamicRendered = selectedReports.length === 0 || selectedReports.every(report => {
        const dynamicId = getDynamicVisualId(report.id);
        // Ensure the dynamic visual is actually rendered (not just attempted)
        return dynamicVisualsRendered[dynamicId] === true;
    });

    const allLoaded = allStaticInOrderRendered && allDynamicRendered;
    useAuthStore.getState().setVisualsLoaded(allLoaded);

    if (allLoaded) {
        console.log('All currently ordered STATIC and DYNAMIC PowerBI visuals reported rendered.');
    } else {
        // More detailed logging for debugging
        console.log(
            'Waiting for visuals to render. Config Loaded:', !isLoadingConfig,
            'Static Check (Count:', staticVisualsInCurrentOrder.length, 'Rendered:', allStaticInOrderRendered, ')',
            'Dynamic Check (Count:', selectedReports.length, 'Rendered:', allDynamicRendered, ')'
        );
         // Log specific pending visuals
         staticVisualsInCurrentOrder.forEach(config => {
             if (!visualRendered[config.key]) console.log(` - Pending static: ${config.key}`);
         });
         selectedReports.forEach(report => {
             const dynamicId = getDynamicVisualId(report.id);
             if (dynamicVisualsRendered[dynamicId] !== true) console.log(` - Pending dynamic: ${dynamicId} (${report.title})`);
         });
    }
  // Depend on render states, config loading status, and the lists defining what *should* be rendered
  }, [
      visualRendered, dynamicVisualsRendered, isLoadingConfig,
      staticVisualConfigs, selectedReports, visualOrder // visualOrder needed to check relevant static visuals
  ]);


  // *** REMOVED DUPLICATE useEffect for global loading state ***


  // Setup double-click listeners effect
  useEffect(() => {
    // Only setup listeners once config is loaded to ensure refs are stable
    if (!isLoadingConfig) {
        console.log("Setting up double-click listeners for static visuals.");
        const cleanup = setupDoubleClickReset();
        return () => {
            cleanup();
            console.log("Cleaned up double-click listeners.");
        };
    }
  }, [isLoadingConfig, setupDoubleClickReset]); // Added isLoadingConfig


  // --- Render ---
  if (isLoadingConfig) {
    return (
      <div className="flex justify-center items-center h-screen">
        {/* Consider adding a more visually appealing loader/spinner */}
        <svg className="animate-spin h-10 w-10 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-3 text-gray-600">Loading Dashboard Layout...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Dashboard Header */}
      <div className="mb-6 mt-[0px]">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
          Dashboard
        </h1>
      </div>

      {/* Sticky Filter Controls */}
      <div className="sticky top-0 z-10 bg-gray-100/80 backdrop-blur-sm py-2 mb-4 mt-[-23px] border-b border-gray-200"> {/* Adjusted style */}
        <div className="flex flex-col sm:flex-row justify-between items-center">
          {/* Empty placeholder for alignment (if needed) */}
          <div className="hidden sm:block flex-1" /> {/* Added flex-1 */}

          {/* Filter Buttons Area */}
          <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
            {/* Store Filter Button and Dropdown */}
            <div className="relative">
              <button
                aria-haspopup="true"
                aria-expanded={showFilters && activeFilterCategory === 'Store'}
                className={`flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                  activeFilterCategory === 'Store' && showFilters
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
                onClick={() => toggleFilterCategory('Store')}
              >
                <Filter className="w-4 h-4 mr-1.5 sm:mr-2" />
                Store
                <ChevronDown
                  className={`w-4 h-4 ml-1.5 sm:ml-2 transition-transform duration-200 ${
                    showFilters && activeFilterCategory === 'Store' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showFilters && activeFilterCategory === 'Store' && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                  <div className="py-1 max-h-60 overflow-y-auto">
                    <h3 className="px-3 py-2 sm:px-4 text-sm font-semibold text-gray-700 border-b sticky top-0 bg-white z-10">
                      Select Store
                    </h3>
                    {filterCategories[0].options.map((option) => (
                      <button
                        key={option.id}
                        role="menuitem"
                        className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-sm ${
                          selectedCategory === option.value
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
  
            {/* Segment Filter Button and Dropdown */}
            <div className="relative">
              <button
                aria-haspopup="true"
                aria-expanded={showFilters && activeFilterCategory === 'Segment'}
                className={`flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                  activeFilterCategory === 'Segment' && showFilters
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
                onClick={() => toggleFilterCategory('Segment')}
              >
                <Filter className="w-4 h-4 mr-1.5 sm:mr-2" />
                Segment
                <ChevronDown
                  className={`w-4 h-4 ml-1.5 sm:ml-2 transition-transform duration-200 ${
                    showFilters && activeFilterCategory === 'Segment' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showFilters && activeFilterCategory === 'Segment' && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                  <div className="py-1 max-h-60 overflow-y-auto">
                    <h3 className="px-3 py-2 sm:px-4 text-sm font-semibold text-gray-700 border-b sticky top-0 bg-white z-10">
                      Select Segment
                    </h3>
                    {filterCategories[1].options.map((option) => (
                      <button
                        key={option.id}
                        role="menuitem"
                        className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-sm ${
                          selectedStore === option.value
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
  
            {/* Clear Button (Conditional) */}
            {(selectedCategory !== 'All' || selectedStore !== 'All') && (
              <button
                className="bg-red-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                onClick={clearFilters}
                title="Reset all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Saving Indicator / Error Message */}
      {isSavingConfig && <div className="text-center text-gray-500 my-2">Saving layout...</div>}
      {saveError && <div className="text-center text-red-500 my-2">{saveError}</div>}


      {/* Unified Drag and Drop Grid for All Visuals */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visualOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {visualItemsForRender.map((visualItem) => (
              <SortableVisual
                key={visualItem.id}
                id={visualItem.id}
                title={visualItem.title}
              >
                <div
                  className="h-48 sm:h-56 md:h-64 lg:h-[200px] flex items-center justify-center bg-white rounded-lg overflow-hidden shadow-md border border-gray-200" // Added border/shadow
                  ref={visualItem.ref}
                >
                   {/* Improved Loading State inside visual */}
                  {!embedData && (
                     <div className="text-center p-4 text-gray-500">
                       <svg className="animate-spin h-6 w-6 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Loading Visual...
                     </div>
                   )}
                   {/* Placeholder if embed fails - could check specific error state */}
                   {/* { embedErrorState[visualItem.id] && <div className="p-4 text-red-500">Error loading visual.</div> } */}
                </div>
              </SortableVisual>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Report Section */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={openModal}
          className="w-[135px] h-[39px] text-white px-5 py-2.5 shadow-md flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-full transition-colors duration-150 hover:bg-gray-700" // Adjusted hover
          style={{ backgroundColor: "rgb(54, 71, 95)" }}
          title="Add more visuals to the dashboard"
        >
          <Plus className="w-[16px] h-[16px]" />
          <span className="text-[13px] font-medium">Add Report</span>
        </button>
      </div>

      {/* Modal Window for selecting reports */}
      <ModalWindow
        isOpen={isModalOpen}
        onClose={closeModal}
        onAdd={handleAddReports}
      />
    </div>
  );
}


// Add a simple debounce utility function (or use lodash.debounce)
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
      const later = () => {
          timeout = null;
          func(...args);
      };
      if (timeout !== null) {
          clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
  };
}