import React from "react";
import { motion } from 'framer-motion';

const UsersPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users Management</h1>
      <div className="border rounded-lg p-4">
        <p className="text-gray-600">This is a placeholder for the Users Management page.</p>
        <p className="text-gray-500 text-sm mt-2">Here you can view, add, edit, and manage user accounts.</p>
      </div>
    </motion.div>
  );
};

export default UsersPage;
