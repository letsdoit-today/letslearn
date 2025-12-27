import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Beaker,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Calculator,
  Atom,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Demos, { Demo } from '@/lib/Meta';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['physics']);

  const getBreadcrumb = () => {
    const demo = Demos.find(d => d.path === path);
    if (demo) {
      return demo.name;
    }
    return '';
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const menuGroups = [
    {
      id: 'math',
      title: '数学',
      icon: Calculator,
      items: [] as Demo[]
    },
    {
      id: 'physics',
      title: '物理',
      icon: Atom,
      items: [] as Demo[]
    },
    {
      id: 'chemistry',
      title: '化学',
      icon: FlaskConical,
      items: [] as Demo[]
    }
  ];

  menuGroups.forEach(group => {
      group.items = Demos.filter(d => d.category === group.id);
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside 
        className={cn(
          "border-r bg-card flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-screen",
          isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full opacity-0 md:opacity-100 md:w-0 md:translate-x-0"
        )}
      >
        <div className="h-14 flex items-center px-6 border-b whitespace-nowrap">
          <Link to="/" className="font-bold text-lg flex items-center gap-2">
            <Beaker className="w-5 h-5 text-primary" />
            一块学吧!
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/">
            <Button variant={path === '/' ? "secondary" : "ghost"} className="w-full justify-start mb-4">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              首页
            </Button>
          </Link>
          
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-2">
              <Button 
                variant="ghost" 
                className="w-full justify-between hover:bg-transparent px-2 font-semibold text-muted-foreground"
                onClick={() => toggleGroup(group.id)}
              >
                <span className="flex items-center">
                  <group.icon className="w-4 h-4 mr-2" />
                  {group.title}
                </span>
                {expandedGroups.includes(group.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              
              {expandedGroups.includes(group.id) && (
                <div className="mt-1 ml-4 space-y-1 border-l pl-2">
                  {group.items.length > 0 ? (
                    group.items.map((item) => (
                      <Link key={item.path} to={item.path}>
                        <Button 
                          variant={path === item.path ? "secondary" : "ghost"} 
                          size="sm"
                          className={cn("w-full justify-start", path === item.path && "bg-secondary")}
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          <span className="truncate">{item.name}</span>
                        </Button>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-xs text-muted-foreground italic">
                      暂无内容
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
        {/* move to bottom */}
        <div className="p-4 border-t mt-auto whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium">联系我</div>
              <div className="text-xs text-muted-foreground">justdoit@letsdoit.today</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               title={isSidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
             >
               {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
             </Button>
             
             {/* Breadcrumb Navigation */}
             <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">首页</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumb()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          {/* <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </div> */}
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;