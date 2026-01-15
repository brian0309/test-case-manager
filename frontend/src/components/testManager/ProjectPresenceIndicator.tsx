/**
 * Component to display users currently viewing the same project
 * Shows avatar icons with tooltip on hover
 */

import React from "react";

interface ProjectUser {
  id: string;
  name: string;
  avatar?: string;
}

interface ProjectPresenceIndicatorProps {
  /** List of users in the project (excluding current user) */
  users: ProjectUser[];
  /** Maximum number of avatars to show before "+N" */
  maxDisplay?: number;
}

// Generate a consistent color for a user based on their name
function getColorFromName(name: string): string {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
    "from-yellow-400 to-yellow-600",
    "from-red-400 to-red-600",
    "from-indigo-400 to-indigo-600",
    "from-teal-400 to-teal-600",
    "from-orange-400 to-orange-600",
    "from-cyan-400 to-cyan-600",
  ];

  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name (up to 2 characters)
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const ProjectPresenceIndicator: React.FC<ProjectPresenceIndicatorProps> = ({
  users,
  maxDisplay = 4,
}) => {
  if (users.length === 0) {
    return null;
  }

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <div className="flex items-center gap-1 flex-shrink-0 z-10">
      {/* User avatars */}
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={user.id}
            className="relative group/avatar"
            style={{ zIndex: displayUsers.length - index }}
          >
            {/* Avatar */}
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 object-cover"
              />
            ) : (
              <div
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorFromName(
                  user.name
                )} flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-gray-800 cursor-default`}
              >
                {getInitials(user.name)}
              </div>
            )}

            {/* Tooltip - appears on the right */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
              {user.name}
              {/* Arrow pointing left */}
              <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Online indicator with remaining count */}
      <div className="relative group/online flex items-center gap-1.5 ml-2 flex-shrink-0 cursor-default">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {remainingCount > 0 ? `+${remainingCount}` : users.length} online
        </span>

        {/* Tooltip with user names - appears on the right */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/online:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
          <div className="space-y-0.5">
            {users.map((user) => (
              <div key={user.id} className="truncate max-w-32">
                {user.name}
              </div>
            ))}
          </div>
          {/* Arrow pointing left */}
          <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPresenceIndicator;
