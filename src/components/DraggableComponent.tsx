// import React from 'react';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableVisualProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

const SortableVisualComponent: React.FC<SortableVisualProps> = ({ id, title, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div {...attributes} {...listeners} className="cursor-move p-2 text-gray-500 hover:text-gray-700">
          ⋮⋮
        </div>
      </div>
      {children}
    </div>
  );
};

export const SortableVisual = React.memo(SortableVisualComponent);
