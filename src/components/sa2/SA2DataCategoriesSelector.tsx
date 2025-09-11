import React from 'react';
import { 
  PROGRAM_TYPES, 
  DEMOGRAPHICS_TYPES, 
  ECONOMIC_TYPES, 
  HEALTH_TYPES 
} from '../../components/HeatmapDataService';

interface SA2DataCategoriesSelectorProps {
  availableMetrics: string[];
  selectedMetrics: string[];
  onMetricToggle: (metricKey: string, selected: boolean) => void;
}

const SA2DataCategoriesSelector: React.FC<SA2DataCategoriesSelectorProps> = ({
  availableMetrics,
  selectedMetrics,
  onMetricToggle
}) => {
  // Helper function to check if a metric is selected
  const isMetricSelected = (metricKey: string) => selectedMetrics.includes(metricKey);
  
  // Helper function to create combined label
  const createCombinedLabel = (category: string, subcategory: string) => {
    return `${category} - ${subcategory}`;
  };
  
  return (
    <div className="space-y-4">
      {/* Demographics Section */}
      <div className="border rounded-md p-3">
        <h4 className="font-medium text-green-700">Demographics</h4>
        <div className="mt-2 space-y-2">
          {Object.entries(DEMOGRAPHICS_TYPES).map(([category, subcategories]) => (
            <div key={category} className="space-y-1">
              <h5 className="text-sm font-medium">{category}</h5>
              {subcategories.map(subcategory => {
                const metricKey = `Demographics | ${subcategory}`;
                const combinedLabel = `Demographics - ${subcategory}`;
                const isAvailable = availableMetrics.includes(metricKey);
                
                return isAvailable ? (
                  <div key={subcategory} className="ml-2">
                    <label className="text-sm flex items-start">
                      <input 
                        type="checkbox" 
                        checked={isMetricSelected(metricKey)}
                        onChange={(e) => onMetricToggle(metricKey, e.target.checked)}
                        className="mr-1 mt-1"
                      />
                      <span className="line-clamp-2">{combinedLabel}</span>
                    </label>
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Economics Section */}
      <div className="border rounded-md p-3">
        <h4 className="font-medium text-blue-700">Economics</h4>
        <div className="mt-2 space-y-2">
          {Object.entries(ECONOMIC_TYPES).map(([category, subcategories]) => (
            <div key={category} className="space-y-1">
              <h5 className="text-sm font-medium">{category}</h5>
              {subcategories.map(subcategory => {
                const metricKey = `Economics | ${subcategory}`;
                const combinedLabel = `Economics - ${subcategory}`;
                const isAvailable = availableMetrics.includes(metricKey);
                
                return isAvailable ? (
                  <div key={subcategory} className="ml-2">
                    <label className="text-sm flex items-start">
                      <input 
                        type="checkbox" 
                        checked={isMetricSelected(metricKey)}
                        onChange={(e) => onMetricToggle(metricKey, e.target.checked)}
                        className="mr-1 mt-1"
                      />
                      <span className="line-clamp-2">{combinedLabel}</span>
                    </label>
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Healthcare Section */}
      <div className="border rounded-md p-3">
        <h4 className="font-medium text-purple-700">Healthcare</h4>
        <div className="mt-2 space-y-2">
          {Object.entries(PROGRAM_TYPES).map(([category, subcategories]) => (
            <div key={category} className="space-y-1">
              <h5 className="text-sm font-medium">{category}</h5>
              {subcategories.map(subcategory => {
                const metricKey = `${category} | ${subcategory}`;
                const combinedLabel = createCombinedLabel(category, subcategory);
                const isAvailable = availableMetrics.includes(metricKey);
                
                return isAvailable ? (
                  <div key={subcategory} className="ml-2">
                    <label className="text-sm flex items-start">
                      <input 
                        type="checkbox" 
                        checked={isMetricSelected(metricKey)}
                        onChange={(e) => onMetricToggle(metricKey, e.target.checked)}
                        className="mr-1 mt-1"
                      />
                      <span className="line-clamp-2">{combinedLabel}</span>
                    </label>
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Health Statistics Section */}
      <div className="border rounded-md p-3">
        <h4 className="font-medium text-red-700">Health Statistics</h4>
        <div className="mt-2 space-y-2">
          {Object.entries(HEALTH_TYPES).map(([category, subcategories]) => (
            <div key={category} className="space-y-1">
              <h5 className="text-sm font-medium">{category}</h5>
              {subcategories.map(subcategory => {
                const metricKey = `Health Statistics | ${subcategory}`;
                const combinedLabel = `Health Statistics - ${subcategory}`;
                const isAvailable = availableMetrics.includes(metricKey);
                
                return isAvailable ? (
                  <div key={subcategory} className="ml-2">
                    <label className="text-sm flex items-start">
                      <input 
                        type="checkbox" 
                        checked={isMetricSelected(metricKey)}
                        onChange={(e) => onMetricToggle(metricKey, e.target.checked)}
                        className="mr-1 mt-1"
                      />
                      <span className="line-clamp-2">{combinedLabel}</span>
                    </label>
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SA2DataCategoriesSelector; 