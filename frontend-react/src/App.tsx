import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomeIcon, DocumentTextIcon, UsersIcon, ChartBarIcon, CogIcon } from '@heroicons/react/24/outline';
import NewRequest from './components/NewRequest';

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white h-screen fixed">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Notesheet AI</h1>
      </div>
      <nav className="mt-4">
        <Link to="/" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
          <HomeIcon className="h-5 w-5 mr-2" />
          New Request
        </Link>
        <Link to="/notesheets" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          My Note Sheets
        </Link>
        <Link to="/approvals" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
          <UsersIcon className="h-5 w-5 mr-2" />
          Approvals
        </Link>
        <Link to="/analytics" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          Analytics
        </Link>
        <Link to="/rag" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
          <CogIcon className="h-5 w-5 mr-2" />
          RAG Management
        </Link>
      </nav>
    </div>
  );
};

const DashboardShell = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 w-full p-6">
        <Routes>
          <Route path="/" element={<NewRequest />} />
          <Route path="/notesheets" element={<div>My Note Sheets</div>} />
          <Route path="/approvals" element={<div>Approvals</div>} />
          <Route path="/analytics" element={<div>Analytics</div>} />
          <Route path="/rag" element={<div>RAG Management</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <DashboardShell />
    </Router>
  );
}