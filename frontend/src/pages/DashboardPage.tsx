import React from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, MessageSquare, Calendar, Clock, ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
}

interface Activity {
  id: number;
  user: string;
  action: string;
  time: string;
  avatar: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

const stats: Stat[] = [
  { name: 'Total Users', value: '2,420', change: '+11%', changeType: 'increase', icon: Users },
  { name: 'Total Posts', value: '1,210', change: '+5.4%', changeType: 'increase', icon: FileText },
  { name: 'Messages', value: '568', change: '-2.3%', changeType: 'decrease', icon: MessageSquare },
  { name: 'Upcoming Events', value: '12', change: '+3', changeType: 'neutral', icon: Calendar },
];

const recentActivity: Activity[] = [
  { id: 1, user: 'John Doe', action: 'created a new post', time: '2 minutes ago', avatar: 'JD' },
  { id: 2, user: 'Jane Smith', action: 'updated profile', time: '10 minutes ago', avatar: 'JS' },
  { id: 3, user: 'Mike Johnson', action: 'commented on post', time: '25 minutes ago', avatar: 'MJ' },
  { id: 4, user: 'Sarah Williams', action: 'joined the platform', time: '1 hour ago', avatar: 'SW' },
];

const chartData: ChartDataPoint[] = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}! 👋</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">Here's what's happening with your dashboard today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow p-4 md:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                <div className={`flex items-center mt-2 text-xs md:text-sm ${
                  stat.changeType === 'increase' ? 'text-green-600' : 
                  stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <ArrowUp className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  ) : stat.changeType === 'decrease' ? (
                    <ArrowDown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-lg shadow p-4 md:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3 sm:gap-0">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Activity Overview</h2>
            <select className="text-xs md:text-sm border border-gray-200 rounded-md px-2 md:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64 sm:h-72 md:h-80 w-full overflow-x-auto">
            <div className="min-w-[300px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow overflow-hidden"
        >
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[400px] md:max-h-[500px] overflow-y-auto">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-3 md:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs md:text-sm">
                    {activity.avatar}
                  </div>
                  <div className="ml-3 md:ml-4 flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                      {activity.user} <span className="text-gray-500 font-normal">{activity.action}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 md:p-4 border-t border-gray-200 text-center">
            <button className="text-xs md:text-sm font-medium text-blue-600 hover:text-blue-800">
              View all activity
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
