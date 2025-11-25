import React from "react";
import { motion } from 'framer-motion';

const PostsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Posts Management</h1>
      <div className="border rounded-lg p-4">
        <p className="text-gray-600">This is a placeholder for the Posts Management page.</p>
        <p className="text-gray-500 text-sm mt-2">Here you can view, create, edit, and manage blog posts.</p>
      </div>
    </motion.div>
  );
};

export default PostsPage;
