import React from 'react';

interface Precedent {
  id: string;
  category: string;
  excerpt: string;
  full_text?: string;
}

interface PrecedentsPanelProps {
  precedents: Precedent[];
}

const PrecedentsPanel = ({ precedents }: PrecedentsPanelProps) => {
  const [selectedPrecedent, setSelectedPrecedent] = React.useState<Precedent | null>(null);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4">Similar Precedents</h3>
      <div className="space-y-2">
        {precedents.map((precedent) => (
          <div
            key={precedent.id}
            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedPrecedent(precedent)}
          >
            <div className="font-medium">ID: {precedent.id}</div>
            <div className="text-sm text-gray-600">{precedent.excerpt}</div>
          </div>
        ))}
      </div>
      {selectedPrecedent && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-bold">Full Precedent: {selectedPrecedent.id}</h4>
          <pre className="mt-2 text-sm whitespace-pre-wrap">{selectedPrecedent.full_text}</pre>
          <button
            onClick={() => setSelectedPrecedent(null)}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default PrecedentsPanel;