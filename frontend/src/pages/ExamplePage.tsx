import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URL } from "../utils/api";
import { Loader } from "lucide-react";

// Configure axios to send credentials
axios.defaults.withCredentials = true;

interface ExampleResponse {
  success: boolean;
  message: string;
  timestamp: string;
  user?: {
    id: string;
    email: string;
  };
}

const ExamplePage: React.FC = () => {
  const [data, setData] = useState<ExampleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExample = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get<ExampleResponse>(`${API_URL}/example/example`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchExample();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Example Feature 🚀</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">
          This page demonstrates the feature-based backend architecture.
        </p>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow p-4 md:p-6"
      >
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">API Response</h2>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Hello World Message */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                {data.message}
              </p>
              <p className="text-gray-600 text-sm">
                This message is coming from the backend API at /api/example/example
              </p>
            </div>

            {/* Response Details */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Response Details</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Status:</span>
                  <span className="text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      data.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {data.success ? '✓ Success' : '✗ Failed'}
                    </span>
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Message:</span>
                  <span className="text-sm text-gray-900">{data.message}</span>
                </div>

                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Timestamp:</span>
                  <span className="text-sm text-gray-900">{new Date(data.timestamp).toLocaleString()}</span>
                </div>

                {data.user && (
                  <>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">User ID:</span>
                      <span className="text-sm text-gray-900 font-mono">{data.user.id}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">User Email:</span>
                      <span className="text-sm text-gray-900">{data.user.email}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Raw JSON */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Raw JSON Response</h3>
              </div>
              <div className="bg-gray-900 p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6"
      >
        <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">About This Feature</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            This example demonstrates the feature-based backend architecture implemented in this application.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Protected route requiring authentication</li>
            <li>Feature organized in <code className="bg-blue-100 px-1 rounded">backend/services/example/</code></li>
            <li>Includes controllers, routes, services, types, and tests</li>
            <li>Returns personalized data based on authenticated user</li>
          </ul>
          <p className="mt-3">
            <strong>API Endpoint:</strong> <code className="bg-blue-100 px-1 rounded">GET /api/example/example</code>
          </p>
          <p>
            See <code className="bg-blue-100 px-1 rounded">Documentation/ADDING_FEATURES.md</code> for a complete guide on adding new features.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ExamplePage;
