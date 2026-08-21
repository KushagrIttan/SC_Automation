import React, { useState } from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface Rule {
  rule_number: string;
  excerpt: string;
  full_text: string;
}

interface RuleSidebarProps {
  rules: Rule[];
}

const RuleSidebar = ({ rules }: RuleSidebarProps) => {
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <BookOpenIcon className="h-5 w-5 mr-2" />
        Rules Cited
      </h3>
      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedRule(rule)}
          >
            <div className="font-medium">{rule.rule_number}</div>
            <div className="text-sm text-gray-600">{rule.excerpt}</div>
          </div>
        ))}
      </div>
      {selectedRule && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-bold">Rule: {selectedRule.rule_number}</h4>
          <pre className="mt-2 text-sm whitespace-pre-wrap">{selectedRule.full_text}</pre>
          <button
            onClick={() => setSelectedRule(null)}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default RuleSidebar;