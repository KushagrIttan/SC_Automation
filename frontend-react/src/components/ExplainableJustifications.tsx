import React from 'react';
import { LightBulbIcon } from '@heroicons/react/24/outline';

interface Explanation {
  reason: string;
  details: string;
}

interface ExplainableJustificationsProps {
  explanations: Explanation[];
}

const ExplainableJustifications = ({ explanations }: ExplainableJustificationsProps) => {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-500" />
        Why This Draft?
      </h3>
      <div className="space-y-2">
        {explanations.map((explanation, index) => (
          <div key={index} className="border rounded-md">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full p-3 text-left flex justify-between items-center hover:bg-gray-50"
            >
              <span className="font-medium">{explanation.reason}</span>
              <svg
                className={`h-5 w-5 transform transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {expandedIndex === index && (
              <div className="p-3 border-t text-sm text-gray-600">
                {explanation.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplainableJustifications;