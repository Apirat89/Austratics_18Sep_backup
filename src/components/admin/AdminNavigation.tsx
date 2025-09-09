'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  MessageSquare, 
  Search, 
  Bookmark, 
  Settings,
  Home 
} from 'lucide-react';

const navigation = [
  {
    name: 'Overview',
    href: '/admin',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    name: 'Feature Usage',
    href: '/admin/usage',
    icon: BarChart3,
    description: 'User engagement analytics'
  },
  {
    name: 'Conversations',
    href: '/admin/conversations',
    icon: MessageSquare,
    description: 'Chat history management'
  },
  {
    name: 'Search History',
    href: '/admin/search-history',
    icon: Search,
    description: 'User search patterns'
  },
  {
    name: 'Saved Items',
    href: '/admin/saved-items',
    icon: Bookmark,
    description: 'User bookmarks management'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  }
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white rounded-lg shadow p-4">
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <div>
                <div className="font-medium">{item.name}</div>
                <div className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 