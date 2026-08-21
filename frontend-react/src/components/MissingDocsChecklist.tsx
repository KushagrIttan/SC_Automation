import React from 'react';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';

interface MissingDocsChecklistProps {
  requiredDocs: string[];
  attachedDocs: string[];
  onAttach: (doc: string) => void;
}

const MissingDocsChecklist = ({ requiredDocs, attachedDocs, onAttach }: MissingDocsChecklistProps) => {
  const missingDocs = requiredDocs.filter(doc => !attachedDocs.includes(doc));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <DocumentCheckIcon className="h-5 w-5 mr-2" />
        Required Documents
      </h3>
      <div className="space-y-2">
        {requiredDocs.map((doc) => {
          const isAttached = attachedDocs.includes(doc);
          return (
            <div key={doc} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center">
                {isAttached ? (
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`ml-2 ${isAttached ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{doc}</span>
              </div>
              {!isAttached && (
                <button
                  onClick={() => onAttach(doc)}
                  className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  Attach
                </button>
              )}
            </div>
          );
        })}
      </div>
      {missingDocs.length > 0 && (
        <div className="mt-4 p-2 bg-red-50 text-red-700 rounded">
          Missing {missingDocs.length} document(s). Please attach before submission.
        </div>
      )}
    </div>
  );
};

export default MissingDocsChecklist;