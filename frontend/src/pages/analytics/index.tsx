import React from "react";
import { motion } from 'framer-motion';

const AnalyticsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mac-card mx-2 my-2 p-4 sm:p-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
      <div className="border rounded-lg p-4">
        <p className="text-gray-600">This is a placeholder for the Analytics page.</p>
        <p className="text-gray-500 text-sm mt-2">Here you can view and analyze your data and statistics.</p>
      </div>
    </motion.div>
  );
};

export default AnalyticsPage;
