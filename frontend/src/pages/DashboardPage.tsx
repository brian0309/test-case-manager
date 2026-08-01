import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, ArrowUp, ArrowDown, LucideIcon, Folder, Layers, CheckSquare } from 'lucide-react';
import { getDashboardStats, DashboardStats } from "../services/statisticsApi";

interface Stat {
  name: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStatsData(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const stats: Stat[] = statsData ? [
    {
      name: 'Total Projects',
      value: statsData.projectCount,
      change: 'Total',
      changeType: 'neutral',
      icon: Folder
    },
    {
      name: 'Total Suites',
      value: statsData.totalSuites,
      change: `+${statsData.suitesAddedToday} today`,
      changeType: statsData.suitesAddedToday > 0 ? 'increase' : 'neutral',
      icon: Layers
    },
    {
      name: 'Total Test Cases',
      value: statsData.totalTestCases,
      change: `+${statsData.testCasesModifiedToday} today`,
      changeType: statsData.testCasesModifiedToday > 0 ? 'increase' : 'neutral',
      icon: CheckSquare
    },
    // Keeping one static or potentially calculating active users if backend supported it, 
    // but for now I'll just show a placeholder or maybe remove the 4th one if not needed.
    // The user asked for specific 3 stats. I will keep the 4th as a placeholder or remove it.
    // Let's keep it as "Active Users" placeholder for now to maintain grid balance, or remove it.
    // User request: "Project count, Total Suite..., test cases number..." -> 3 items.
    // I'll stick to 3 items or maybe add "Test Runs" if available later. 
    // For now, I'll just use the 3 requested and maybe a filler or just 3.
    // Let's use 3 and adjust grid to 3 columns or keep 4 and add a "Coming Soon" or similar.
    // Actually, let's just show the 3 requested stats.
  ] : [];

  return (
    <div className="bg-white dark:bg-gray-900 min-h-full p-4 sm:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-gray-100">Welcome back, {user?.name || 'User'}! 👋</h1>
        <p className="text-gray-500 mt-1 dark:text-gray-400">Here's what's happening with your dashboard today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-4 sm:p-6 h-32 animate-pulse"></div>
          ))
        ) : (
          stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-4 sm:p-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight dark:text-gray-100">{stat.value}</p>
                  <div className={`flex items-center mt-2 text-sm ${stat.changeType === 'increase' ? 'text-system-green' :
                    stat.changeType === 'decrease' ? 'text-system-red' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {stat.changeType === 'increase' ? (
                      <ArrowUp className="w-4 h-4 mr-1" />
                    ) : stat.changeType === 'decrease' ? (
                      <ArrowDown className="w-4 h-4 mr-1" />
                    ) : (
                      <Clock className="w-4 h-4 mr-1" />
                    )}
                    <span className="font-medium">{stat.change}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex-shrink-0">
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none p-3 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-6 gap-1 sm:gap-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight dark:text-gray-100">Activity Overview</h2>
            <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">Test Cases Modified (Last 14 Days)</div>
          </div>
          <div className="h-48 sm:h-80 w-full overflow-hidden sm:overflow-x-auto">
            <div className="h-full">
              <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 192 : 320}>
                <LineChart data={statsData?.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#404040' : '#E5E7EB'} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6B7280', fontSize: window.innerWidth < 640 ? 11 : 12 }}
                    dy={5}
                    interval={window.innerWidth < 640 ? 'preserveStartEnd' : 0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6B7280', fontSize: window.innerWidth < 640 ? 11 : 12 }}
                    width={window.innerWidth < 640 ? 35 : 40}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: document.documentElement.classList.contains('dark') ? '#404040' : '#E5E7EB', strokeWidth: 2 }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontFamily: 'inherit',
                      backgroundColor: document.documentElement.classList.contains('dark') ? '#242424' : '#ffffff',
                      color: document.documentElement.classList.contains('dark') ? '#f5f5f5' : '#1f2937',
                      fontSize: window.innerWidth < 640 ? 12 : 14
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#007AFF"
                    strokeWidth={window.innerWidth < 640 ? 2 : 3}
                    dot={{ r: window.innerWidth < 640 ? 2 : 4, fill: "#007AFF", strokeWidth: 2, stroke: document.documentElement.classList.contains('dark') ? '#242424' : '#fff' }}
                    activeDot={{ r: window.innerWidth < 640 ? 3 : 6, fill: "#007AFF", strokeWidth: 2, stroke: document.documentElement.classList.contains('dark') ? '#242424' : '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight dark:text-gray-100">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto flex-1 max-h-[400px]">
            {statsData?.recentActivity?.map((activity) => (
              <div 
                key={activity.id} 
                onClick={() => navigate(`/test-manager/cases?testCaseId=${activity.testCaseId}`)}
                className="p-4 hover:bg-gray-50/50 transition-colors dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-system-blue to-system-indigo flex items-center justify-center text-white font-medium text-sm shadow-sm overflow-hidden">
                    {activity.avatar.startsWith('http') ? (
                      <img src={activity.avatar} alt={activity.user} className="w-full h-full object-cover" />
                    ) : (
                      activity.avatar
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                      {activity.user} <span className="text-gray-500 font-normal dark:text-gray-400">{activity.action.replace(activity.user, '')}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
                      {new Date(activity.time).toLocaleDateString()} {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )) || (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">No recent activity</div>
              )}
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
