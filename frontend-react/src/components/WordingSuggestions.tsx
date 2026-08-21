import React from 'react';

interface Suggestion {
  original: string;
  suggested: string;
  reason: string;
}

interface WordingSuggestionsProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
}

const WordingSuggestions = ({ suggestions, onAccept }: WordingSuggestionsProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <h3 className="text-lg font-bold mb-4">AI Suggestions</h3>
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-3 border rounded-md">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm text-gray-600">Original:</div>
                <div className="font-medium">{suggestion.original}</div>
                <div className="text-sm text-gray-600 mt-1">Suggested:</div>
                <div className="font-medium text-indigo-600">{suggestion.suggested}</div>
                <div className="text-xs text-gray-500 mt-1">Reason: {suggestion.reason}</div>
              </div>
              <button
                onClick={() => onAccept(suggestion)}
                className="ml-4 px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordingSuggestions;