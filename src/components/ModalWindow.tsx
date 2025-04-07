import React, { useState } from 'react';
// import { Plus } from 'lucide-react';

export interface Report {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
}

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (reports: Report[]) => void;
}

const ModalWindow: React.FC<ModalWindowProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');

  const reports: Report[] = [
    { id: 1, title: 'Category Breakdown', description: 'Key breakdown of category metrics', category: 'Category', type: 'report' },
    { id: 2, title: 'Revenue Trends', description: 'Monthly revenue analysis', category: 'Finance', type: 'chart' },
    { id: 3, title: 'Store Breakdown', description: 'Key breakdown of store metrics', category: 'Store', type: 'kpi' },
  ];

  const filteredReports = activeFilter === 'All' 
    ? reports 
    : reports.filter(report => report.category === activeFilter);

  if (!isOpen) return null;

  const handleAdd = () => {
    const selectedReports = reports.filter(report => 
      selectedReportIds.includes(report.id)
    );
    onAdd(selectedReports);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[7px] shadow-lg w-2/3 max-w-3xl max-h-[80vh] 
                   overflow-y-auto transform translate-x-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-[25px] font-bold flex-1 text-center">
            Add Report to Dashboard
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none text-2xl font-bold ml-4"
            onClick={onClose}
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="px-4 py-3 mt-2 flex space-x-2">
          {['All', 'Category', 'Finance', 'Store'].map((filter) => (
            <button
              key={filter}
              className={`px-3 py-1.5 text-sm rounded-[7px] ${activeFilter === filter ? 'text-white' : 'text-black'}`}
              style={{
                backgroundColor: activeFilter === filter 
                  ? 'rgb(54, 71, 95)' 
                  : 'rgb(207, 215, 228)',
              }}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-2 gap-3 p-5">
          {filteredReports.map(report => (
            <div
            key={report.id}
            className={`bg-gray-200 p-3 rounded-[7px] relative border border-gray-300`}
            style={{
              backgroundColor: selectedReportIds.includes(report.id) ? "rgb(218, 223, 230)" : "transparent",
            }}
            onClick={() => setSelectedReportIds(prev =>
              prev.includes(report.id)
                ? prev.filter(id => id !== report.id)
                : [...prev, report.id]
            )}
          >
            <span className="absolute top-1 right-1 text-[9px] text-gray-500 uppercase bg-white px-1 py-0.5 rounded-[5px] shadow font-bold">
              {report.type}
            </span>
            <h3 className="text-base font-medium mb-1">{report.title}</h3>
            <p className="text-xs text-gray-500">{report.description}</p>
          </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mb-4 mr-5 flex justify-end">
          <button 
            className="w-[60px] h-[32px] text-white 
                      px-4 py-3 shadow-md flex items-center 
                      justify-center space-x-2 focus:outline-none 
                      rounded-full"
            style={{ backgroundColor: "rgb(54, 71, 95)" }}
            onClick={handleAdd}
          >
            <span className="text-[12px] font-medium">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalWindow;