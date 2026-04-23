"use client";

import Cookies from "js-cookie";
// Add these imports at the top
import {
  Activity,
  ArrowLeftRightIcon,
  Bell,
  Briefcase,
  ChevronDown,
  Cog,
  CpuIcon,
  CreditCard,
  FileText,
  GitBranch,
  Globe,
  Home,
  Layers,
  LayoutDashboard,
  Link2,
  List,
  LogOut,
  Menu,
  Package,
  Receipt,
  Route,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  SubscriptIcon,
  Tag,
  Truck,
  User,
  UserCheck,
  UserLockIcon,
  UserRoundPen,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildLocalePath } from "@/i18n/localePath";
import type {
  HeaderClasses,
  SidebarClasses,
  SidebarSection,
} from "@/interfaces/navbar.interface";
import {
  filterMenuByPermissions,
  getUserRoleData,
} from "@/services/commonServie";
import { applyWhiteLabelColors } from "@/utils/themeUtils";
import { getInitials } from "@/utils/utils";
import { useColor } from "../context/ColorContext";
import { useLayout } from "../context/LayoutContext";
import { useTheme } from "../context/ThemeContext";

const resolveProfileImageUrl = (profileImagePath?: string): string => {
  const path = String(profileImagePath || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `/proxy/${path.replace(/^\/+/, "")}`;
};

const resolveAssetUrl = (assetPath?: string): string => {
  const path = String(assetPath || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) return normalizedPath;
  return `${baseUrl}${normalizedPath}`;
};

const DualHeaderLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const activeLocale = useLocale();
  const { layout: menuLayout, setLayout: setMenuLayout } = useLayout();
  const { selectedColor, colorBlock, handleColorChange } = useColor();
  const { isDark } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userRights, setUserRights] = useState<any[]>([]);
  const [filteredSections, setFilteredSections] = useState<SidebarSection[]>(
    [],
  );
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [isProfileImageError, setIsProfileImageError] = useState(false);
  const [secondaryColorHex, setSecondaryColorHex] = useState<string>("");
  const [primaryColorHex, setPrimaryColorHex] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("Agentix");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>("");
  const [isBrandLogoError, setIsBrandLogoError] = useState(false);
  const [locale, setLocale] = useState(activeLocale);
  const [globalSearchInput, setGlobalSearchInput] = useState<string>("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const sidebarScrollRef = useRef<HTMLElement | null>(null);
  const sidebarScrollTopRef = useRef(0);
  const sidebarScrollKey = "vts.sidebar.scrollTop";

  const setSidebarRef = useCallback((node: HTMLElement | null) => {
    sidebarScrollRef.current = node;
    if (!node || typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(sidebarScrollKey);
    if (saved) {
      const next = Number.parseInt(saved, 10);
      if (Number.isFinite(next)) {
        node.scrollTop = next;
        sidebarScrollTopRef.current = next;
      }
    }
  }, []);

  useEffect(() => {
    setLocale(activeLocale);
  }, [activeLocale]);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setGlobalSearchQuery(globalSearchInput);
    }, 350);

    return () => window.clearTimeout(debounceTimer);
  }, [globalSearchInput]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      sidebarScrollTopRef.current = el.scrollTop;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el || typeof window === "undefined") return;

    const saved = window.sessionStorage.getItem(sidebarScrollKey);
    if (saved) {
      const next = Number.parseInt(saved, 10);
      if (Number.isFinite(next)) {
        el.scrollTop = next;
        sidebarScrollTopRef.current = next;
      }
    }

    return () => {
      window.sessionStorage.setItem(
        sidebarScrollKey,
        String(sidebarScrollTopRef.current || 0),
      );
    };
  }, []);

  const captureSidebarScroll = () => {
    const el = sidebarScrollRef.current;
    const next = el ? el.scrollTop : sidebarScrollTopRef.current;
    sidebarScrollTopRef.current = next;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sidebarScrollKey, String(next || 0));
    }
  };

  const handleLocaleChange = (nextLocale: string) => {
    setLocale(nextLocale);
    Cookies.set("locale", nextLocale, {
      expires: 365,
      path: "/",
      sameSite: "lax",
    });

    const nextPath = buildLocalePath(
      nextLocale,
      window.location.pathname || "/",
    );
    window.location.href = `${nextPath}${window.location.search}`;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("whiteLabelTheme");
      if (savedTheme) {
        try {
          const parsedTheme = JSON.parse(savedTheme);
          applyWhiteLabelColors(parsedTheme, handleColorChange);
          setSecondaryColorHex(parsedTheme.secondaryColorHex || "");
          setPrimaryColorHex(parsedTheme.primaryColorHex || "");
        } catch (err) {
          console.error("Error applying saved theme:", err);
        }
      }

      const userData = localStorage.getItem("user");
      const parsedUser = userData ? JSON.parse(userData) : null;
      setUser(parsedUser);
      setProfileImageUrl(resolveProfileImageUrl(parsedUser?.profileImagePath));
      setIsProfileImageError(false);

      const whiteLabelRaw =
        localStorage.getItem("whiteLabel") ||
        localStorage.getItem("whiteLabelTheme");
      let whiteLabelData: any = null;
      if (whiteLabelRaw) {
        try {
          whiteLabelData = JSON.parse(whiteLabelRaw);
        } catch (err) {
          console.error("Error parsing whiteLabel data:", err);
        }
      }

      const resolvedBrandName = String(
        whiteLabelData?.brandName ||
          parsedUser?.whiteLabel?.brandName ||
          "Agentix",
      ).trim();
      const resolvedLogo = resolveAssetUrl(
        whiteLabelData?.logoUrl ||
          whiteLabelData?.logoPath ||
          parsedUser?.whiteLabel?.logoUrl ||
          parsedUser?.whiteLabel?.logoPath,
      );

      setBrandName(resolvedBrandName || "Agentix");
      setBrandLogoUrl(resolvedLogo);
      setIsBrandLogoError(false);
    }
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch permissions on mount
  useEffect(() => {
    function getPermissionsList() {
      if (typeof window === "undefined") return;

      try {
        setIsLoadingPermissions(true);
        const storedPermissions = localStorage.getItem("permissions");

        if (storedPermissions) {
          const parsedPermissions = JSON.parse(storedPermissions);
          setUserRights(parsedPermissions);
        } else {
          console.warn("No permissions found in localStorage.");
        }
      } catch (error) {
        console.error("Error fetching permissions from localStorage:", error);
      } finally {
        setIsLoadingPermissions(false);
      }
    }

    getPermissionsList();

    const handlePermissionUpdate = () => getPermissionsList();
    window.addEventListener("permissions-updated", handlePermissionUpdate);

    return () =>
      window.removeEventListener("permissions-updated", handlePermissionUpdate);
  }, [pathname]);

  // Filter menu sections based on permissions
  useEffect(() => {
    if (userRights.length > 0) {
      const filtered = sidebarSections
        .map((section) => {
          const filteredItems = filterMenuByPermissions(
            section.items,
            userRights,
          );

          return {
            ...section,
            items: filteredItems,
          };
        })
        .filter((section) => section.items.length > 0);
      setFilteredSections(filtered);
    } else {
      setFilteredSections([]);
    }

    //  setFilteredSections(sidebarSections);
  }, [userRights]);

  // Collapse all expanded parent menus whenever the sidebar closes
  useEffect(() => {
    if (!isSidebarOpen) {
      setExpandedMenus([]);
    }
  }, [isSidebarOpen]);

  const handleLogout = () => {
    const keysToRemove = [
      "authToken",
      "darkMode",
      "permissions",
      "primaryHsl",
      "user",
      "whiteLabel",
      "whiteLabelTheme",
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    Cookies.remove("authToken", { path: "/" });

    window.location.href = "/";
  };

  const handleMenuClick = (itemId: string) => {
    captureSidebarScroll();
    if (!isMobile && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
    setSelectedItemId(itemId);
  };

  const handleExpandableMenuClick = (menuId: string) => {
    captureSidebarScroll();
    if (!isMobile && !isSidebarOpen) {
      setIsSidebarOpen(true);
      setExpandedMenus((prev) =>
        prev.includes(menuId) ? prev : [...prev, menuId],
      );
    } else {
      toggleMenu(menuId);
    }
  };

  // Complete menu structure with nested items
  const sidebarSections: SidebarSection[] = [
    {
      title: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          active: false,
          path: "/dashboard",
        },
        {
          id: "track-trace",
          label: "Track & Trace",
          icon: Activity,
          active: false,
          path: "/fleet",
        },
        {
          id: "report",
          label: "Reports",
          icon: FileText,
          active: false,
          expandable: true,
          children: [
            {
              id: "run-report",
              label: "Run Report",
              icon: FileText,
              path: "/report/run-report",
            },
            {
              id: "movement-report",
              label: "Movement Report",
              icon: FileText,
              path: "/report/movement-report",
            },
            {
              id: "alarm-report",
              label: "Alarm Report",
              icon: FileText,
              path: "/report/alarm-report",
            },
            {
              id: "geofence-report",
              label: "Geofence Report",
              icon: FileText,
              path: "/report/geofence-report",
            },
          ],
        },
      ],
    },

    {
      title: "FLEET OPERATIONS",
      items: [
        {
          id: "fleet",
          label: "Fleet",
          icon: Truck,
          active: false,
          expandable: true,
          children: [
            {
              id: "vehicles",
              label: "Vehicle",
              icon: Truck,
              path: "/vehicles",
            },
            {
              id: "drivers",
              label: "Driver",
              icon: UserRoundPen,
              path: "/driver",
            },
            {
              id: "devices",
              label: "Device",
              icon: Smartphone,
              path: "/devices",
            },
            {
              id: "geofence-master",
              label: "Geofence Master",
              icon: ShieldCheck,
              path: "/geofence",
            },
            {
              id: "sim-master",
              label: "SIM Master",
              icon: Smartphone,
              path: "/sim-master",
            },
          ],
        },
        {
          id: "assignments",
          label: "Assignments",
          icon: Link2,
          active: false,
          expandable: true,
          children: [
            {
              id: "device-assignments",
              label: "Device Assignments",
              icon: Link2,
              path: "/devicemap",
            },
            {
              id: "vehicle-geofence",
              label: "Vehicle Geofence",
              icon: Link2,
              path: "/vehicle-geofence",
            },
            {
              id: "driver-assignments",
              label: "Driver Assignments",
              icon: UserLockIcon,
              path: "/driver-assignment",
            },
          ],
        },
      ],
    },

    {
      title: "CONFIGURATIONS",
      items: [
        {
          id: "accounts",
          label: "Accounts",
          icon: Briefcase,
          active: false,
          expandable: true,
          children: [
            {
              id: "account-list",
              label: "Account List",
              icon: List,
              path: "/accounts",
            },
            {
              id: "categories",
              label: "Categories",
              icon: Layers,
              path: "/categories",
            },
            {
              id: "hierarchy",
              label: "Hierarchy",
              icon: GitBranch,
              path: "/hierarchy",
            },
            {
              id: "configuration",
              label: "Configuration",
              icon: Settings,
              path: "/configuration",
            },
            {
              id: "form-master",
              label: "Form Master",
              icon: FileText,
              path: "/formmaster",
            },
            {
              id: "dynamic-form-builder",
              label: "Dynamic Form Builder",
              icon: FileText,
              path: "/dynamic-formbuilder",
            },
            {
              id: "white-label",
              label: "White Label",
              icon: Tag,
              path: "/whiteLabel",
            },
          ],
        },

        {
          id: "users",
          label: "Users",
          icon: Users,
          active: false,
          expandable: true,
          children: [
            { id: "user-list", label: "User List", icon: User, path: "/users" },
            {
              id: "roles-permissions",
              label: "Roles & Permissions",
              icon: Shield,
              path: "/users/roles-permissions",
            },
            {
              id: "activity-logs",
              label: "Activity Logs",
              icon: Activity,
              path: "/users/activity-logs",
            },
          ],
        },

        {
          id: "assets",
          label: "Assets",
          icon: Package,
          active: false,
          expandable: true,
          children: [
            {
              id: "asset-list",
              label: "Asset List",
              icon: List,
              path: "/assets",
            },
          ],
        },

        {
          id: "billing",
          label: "Billing",
          icon: CreditCard,
          active: false,
          expandable: true,
          children: [
            {
              id: "manage-plans",
              label: "Manage Plans",
              icon: List,
              path: "/manage-plans",
            },
            {
              id: "subscriptions",
              label: "Subscriptions",
              icon: SubscriptIcon,
              path: "/subscriptions",
            },
            {
              id: "invoices",
              label: "Invoice",
              icon: Receipt,
              path: "/invoices",
            },
          ],
        },
      ],
    },
    {
      title: "Master Data",
      items: [
        {
          id: "master-data",
          label: "Master Data",
          icon: Globe,
          active: false,
          expandable: true,
          children: [
            {
              id: "manufacturers",
              label: "Manufacturers",
              icon: Tag,
              path: "/manufacturers",
            },
            {
              id: "device-categories",
              label: "Device Categories",
              icon: List,
              path: "/device-categories",
            },
            {
              id: "device-model",
              label: "Device Model",
              icon: CpuIcon,
              path: "/device-model",
            },
            {
              id: "network-providers",
              label: "Network Providers",
              icon: Globe,
              path: "/network-providers",
            },
            {
              id: "vehicle-brands",
              label: "Vehicle Brands",
              icon: Truck,
              path: "/vehicle-brands",
            },
            {
              id: "vehicle-types",
              label: "Vehicle Types",
              icon: Layers,
              path: "/vehicle-types",
            },
            {
              id: "service-vendors",
              label: "Service Vendors",
              icon: Briefcase,
              path: "/service-vendors",
            },
          ],
        },
      ],
    },

    {
      title: "SYSTEM SETUP",
      items: [
        {
          id: "settings",
          label: "Settings",
          icon: Cog,
          active: false,
          path: "/settings",
        },
      ],
    },
    {
      title: "COMPLIANCE",
      items: [
        {
          id: "compliance",
          label: "Vehicle Compliance",
          icon: ShieldAlert,
          active: false,
          path: "/vehicle-compliance",
        },
      ],
    },
    {
      title: "TRIP MANAGEMENT",
      items: [
        {
          id: "trip-management",
          label: "TMS",
          icon: Route,
          active: false,
          expandable: true,
          children: [
            {
              id: "route-master",
              label: "Route Master",
              icon: Route,
              path: "/route-master",
            },
            {
              id: "trip-master",
              label: "Trip Master",
              icon: Cog,
              path: "/trip-master",
            },
          ],
        },
      ],
    },
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId],
    );
  };

  // ─────────────────────────────────────────────────────────────
  // ACTIVE ITEM STYLE — black in light mode, white in dark mode.
  // No secondary/accent colors used for active state.
  // ─────────────────────────────────────────────────────────────
  const getActiveItemStyle = (itemId: string): React.CSSProperties => {
    if (selectedItemId !== itemId) return {};
    return { color: isDark ? "#ffffff" : "#000000" };
  };

  const getActiveItemBgStyle = (itemId: string): React.CSSProperties => {
    if (selectedItemId !== itemId) return {};
    return {
      color: isDark ? "#ffffff" : "#000000",
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    };
  };

  const visibleSections = useMemo(() => {
    const query = globalSearchQuery.trim().toLowerCase();
    if (!query) return filteredSections;

    return filteredSections
      .map((section) => {
        const items = section.items
          .map((item) => {
            if (!item.expandable) {
              const matchesItem =
                item.label.toLowerCase().includes(query) ||
                String(item.path || "")
                  .toLowerCase()
                  .includes(query);
              return matchesItem ? item : null;
            }

            const matchingChildren =
              item.children?.filter(
                (child) =>
                  child.label.toLowerCase().includes(query) ||
                  child.path.toLowerCase().includes(query),
              ) || [];

            const matchesParent = item.label.toLowerCase().includes(query);

            if (!matchesParent && matchingChildren.length === 0) {
              return null;
            }

            return {
              ...item,
              children: matchesParent ? item.children : matchingChildren,
            };
          })
          .filter(Boolean) as SidebarSection["items"];

        return {
          ...section,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [filteredSections, globalSearchQuery]);

  useLayoutEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    const next = sidebarScrollTopRef.current;

    if (Math.abs(el.scrollTop - next) > 1) {
      el.scrollTop = next;
    }
  }, [
    expandedMenus,
    selectedItemId,
    visibleSections,
    isSidebarOpen,
    isMobileSidebarOpen,
    isLoadingPermissions,
    pathname,
  ]);

  const getTopNavHeaderClasses = (): HeaderClasses => {
    if (isDark) {
      return {
        header: "bg-card border-border",
        text: "text-foreground",
        textSecondary: "text-muted-foreground",
        hover: "hover:text-foreground",
        inputBorder: "border-border",
        inputText: "text-foreground",
        hoverBg: "hover:bg-muted",
        dropdown: "bg-card border-border",
        dropdownHover: "hover:bg-muted",
        useCustomBg: false,
      };
    }

    return {
      header: secondaryColorHex ? "" : "bg-white border-border",
      text: "text-gray-900",
      textSecondary: "text-gray-600",
      hover: "hover:text-gray-900",
      inputBorder: "border-gray-200",
      inputText: "text-gray-900",
      hoverBg: "hover:bg-gray-100",
      dropdown: "bg-white border-gray-200",
      dropdownHover: "hover:bg-gray-50",
      useCustomBg: !!secondaryColorHex,
      customBg: secondaryColorHex,
    };
  };

  const renderTopNavHeader = () => {
    const headerClasses = getTopNavHeaderClasses();
    return (
      <div className={isDark ? "dark" : ""}>
        <header
          className={`${headerClasses.header} border-b fixed w-full top-0 z-50`}
          style={
            headerClasses.useCustomBg && headerClasses.customBg
              ? { backgroundColor: headerClasses.customBg }
              : {}
          }
        >
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
            {/* Left side: Logo and Navigation */}
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-2">
                {brandLogoUrl && !isBrandLogoError ? (
                  <img
                    src={brandLogoUrl}
                    alt={brandName}
                    className="w-8 h-8 rounded-lg object-cover"
                    onError={() => setIsBrandLogoError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                    {getInitials(brandName || "A")}
                  </div>
                )}
                <span
                  className={`text-lg md:text-xl font-semibold ${headerClasses.text}`}
                >
                  {brandName}
                </span>
              </div>

              {/* Main Navigation - Hidden on mobile */}
              <nav className="hidden lg:flex items-center gap-6">
                {isLoadingPermissions ? (
                  <div className={`text-sm ${headerClasses.textSecondary}`}>
                    Loading...
                  </div>
                ) : (
                  visibleSections.map((section) =>
                    section.items.map((item) => {
                      if (item.expandable) {
                        return (
                          <div key={item.id} className="relative group">
                            <button
                              className={`flex items-center gap-2 py-1 text-sm ${headerClasses.textSecondary} ${headerClasses.hover}`}
                            >
                              <span>{item.label}</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {/* Dropdown */}
                            <div
                              className={`absolute left-0 top-full mt-2 w-56 ${headerClasses.dropdown} border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}
                            >
                              {item.children?.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive =
                                  selectedItemId === child.id;
                                return (
                                  <Link
                                    key={child.id}
                                    href={child.path}
                                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
                                      isChildActive
                                        ? ""
                                        : `${headerClasses.textSecondary} ${headerClasses.dropdownHover}`
                                    }`}
                                    onClick={() => setSelectedItemId(child.id)}
                                    style={getActiveItemStyle(child.id)}
                                  >
                                    <ChildIcon className="w-4 h-4" />
                                    <span>{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return item.path ? (
                        <Link
                          key={item.id}
                          href={item.path}
                          className={`text-sm py-1 font-medium ${
                            selectedItemId === item.id
                              ? "font-semibold"
                              : `${headerClasses.textSecondary} ${headerClasses.hover}`
                          }`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={getActiveItemStyle(item.id)}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          className={`text-sm py-1 font-medium ${
                            selectedItemId === item.id
                              ? "font-semibold"
                              : `${headerClasses.textSecondary} ${headerClasses.hover}`
                          }`}
                          onClick={() => setSelectedItemId(item.id)}
                          style={getActiveItemStyle(item.id)}
                        >
                          {item.label}
                        </button>
                      );
                    }),
                  )
                )}
              </nav>
            </div>

            {/* Right side: Search and User controls */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${headerClasses.textSecondary}`}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={globalSearchInput}
                  onChange={(e) => setGlobalSearchInput(e.target.value)}
                  className={`pl-10 pr-4 py-2 border ${headerClasses.inputBorder} ${headerClasses.inputText} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40 md:w-64`}
                />
              </div>

              {/* Language */}
              <div className="hidden md:flex items-center gap-2">
                <Globe className="w-4 h-4 text-inherit" />
                <select
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value)}
                  className={`text-sm border rounded-lg px-2 py-1.5 focus:outline-none ${
                    isDark
                      ? "bg-card border-border text-foreground"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                  aria-label="Select language"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              {/* Notification */}
              <button
                className={`relative p-2 ${headerClasses.hoverBg} rounded-lg`}
              >
                <Bell className={`w-5 h-5 ${headerClasses.textSecondary}`} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <button
                className={`flex items-center gap-2 ${headerClasses.hoverBg} rounded-lg p-2`}
              >
                <div className="text-right hidden xl:block">
                  <div className={`text-sm font-medium ${headerClasses.text}`}>
                    {user?.fullName}
                  </div>
                  <div className={`text-xs ${headerClasses.textSecondary}`}>
                    {user?.email}
                  </div>
                </div>

                <div
                  className={`w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center ${headerClasses.textSecondary} text-sm font-medium`}
                >
                  <Package className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </header>
      </div>
    );
  };

  const getSidebarClasses = (): SidebarClasses => {
    if (colorBlock && primaryColorHex && menuLayout === "sidebar") {
      return {
        useCustomBg: true,
        customBg: primaryColorHex,
        border: "border-transparent",
        logo: "bg-white/20",
        logoText: "text-white",
        brandText: "text-white",
        sectionTitle: "text-white/60",
        menuText: "text-white",
        menuIcon: "text-white/80",
        menuHover: "hover:bg-white/10",
        activeMenuBg: "bg-white/20",
        activeMenuText: "text-white",
        activeMenuIcon: "text-white",
        chevron: "text-white/60",
        gridIcon: "text-white/70",
        gridHover: "hover:bg-white/10",
      };
    } else if (isDark) {
      return {
        bg: "bg-card",
        border: "border-border",
        logo: "bg-primary",
        logoText: "text-primary-foreground",
        brandText: "text-white",
        sectionTitle: "text-gray-400",
        menuText: "text-gray-300",
        menuIcon: "text-gray-400",
        menuHover: "hover:bg-white/10",
        activeMenuBg: "bg-white/10",
        activeMenuText: "text-white",
        activeMenuIcon: "text-white",
        chevron: "text-gray-400",
        gridIcon: "text-gray-400",
        gridHover: "hover:bg-white/10",
      };
    } else {
      return {
        useCustomBg: false,
        bg: "bg-white",
        border: "border-border",
        logo: "bg-primary",
        logoText: "text-primary-foreground",
        brandText: "text-gray-900",
        sectionTitle: "text-gray-400",
        menuText: "text-gray-600",
        menuIcon: "text-gray-500",
        menuHover: "hover:bg-gray-100",
        activeMenuBg: "bg-gray-100",
        activeMenuText: "text-black",
        activeMenuIcon: "text-black",
        chevron: "text-gray-400",
        gridIcon: "text-gray-400",
        gridHover: "hover:bg-gray-100",
      };
    }
  };

  const renderSidebarHeader = () => {
    const sidebarClasses = getSidebarClasses();

    const headerBg = isDark ? "bg-card" : "bg-white";
    const useCustomBg = false;
    const headerText = isDark ? "text-white" : "text-gray-900";
    const headerTextSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const headerHoverBg = isDark ? "hover:bg-white/10" : "hover:bg-gray-100";
    const headerIconColor = isDark ? "text-gray-400" : "text-gray-500";
    const headerInputBorder = isDark ? "border-border" : "border-gray-200";
    const headerInputText = isDark ? "text-white" : "text-gray-900";
    const headerInputPlaceholder = isDark
      ? "placeholder:text-gray-500"
      : "placeholder:text-gray-400";
    const headerLogo = "bg-primary";
    const headerLogoText = "text-primary-foreground";

    return (
      <div className={isDark ? "dark" : ""}>
        <header
          className={`${headerBg} fixed top-0 left-0 right-0 z-50 border-b ${sidebarClasses.border} px-4 md:px-6 py-3 flex items-center justify-between transition-all duration-300
            ${!isMobile && isSidebarOpen ? "lg:left-64" : ""}
            ${!isMobile && !isSidebarOpen ? "lg:left-20" : ""}
          `}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isMobile) {
                  setIsMobileSidebarOpen(true);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className={`p-2 ${headerHoverBg} rounded-lg`}
            >
              <Menu
                className={`w-5 h-5 ${headerTextSecondary} cursor-pointer`}
              />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              {brandLogoUrl && !isBrandLogoError ? (
                <img
                  src={brandLogoUrl}
                  alt={brandName}
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={() => setIsBrandLogoError(true)}
                />
              ) : (
                <div
                  className={`w-8 h-8 ${headerLogo} rounded-lg flex items-center justify-center ${headerLogoText} font-bold`}
                >
                  {getInitials(brandName || "A")}
                </div>
              )}
              <span className={`text-lg font-semibold ${headerText}`}>
                {brandName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${headerIconColor}`}
              />
              <input
                type="text"
                placeholder="Search..."
                value={globalSearchInput}
                onChange={(e) => setGlobalSearchInput(e.target.value)}
                className={`pl-10 pr-4 py-2 border ${headerInputBorder} ${headerInputText} ${headerInputPlaceholder} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40 md:w-64 ${isDark ? "bg-card" : "bg-white"}`}
              />
            </div>

            {/* Language */}
            <div className="hidden md:flex items-center gap-2">
              <Globe className={`w-4 h-4 ${headerIconColor}`} />
              <select
                value={locale}
                onChange={(e) => handleLocaleChange(e.target.value)}
                className={`text-sm border rounded-lg px-2 py-1.5 focus:outline-none ${
                  isDark
                    ? "bg-card border-border text-foreground"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="te">Telugu</option>
                <option value="ta">Tamil</option>
                <option value="kn">Kannada</option>
              </select>
            </div>

            {/* Notification */}
            <button className={`relative p-2 ${headerHoverBg} rounded-lg`}>
              <Bell className={`w-5 h-5 ${headerIconColor}`} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className={`flex items-center gap-2 ${headerHoverBg} rounded-lg p-2`}
              >
                {profileImageUrl && !isProfileImageError ? (
                  <img
                    src={profileImageUrl}
                    alt={user?.fullName || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={() => setIsProfileImageError(true)}
                  />
                ) : (
                  <div
                    className={`w-8 h-8 ${headerLogo} rounded-full flex items-center justify-center ${headerLogoText} text-sm font-medium`}
                  >
                    {getInitials(user?.fullName || "U")}
                  </div>
                )}

                <div className="text-right hidden xl:block">
                  <div className={`text-sm font-medium ${headerText}`}>
                    {user?.fullName}
                  </div>
                  <div className={`text-xs ${headerTextSecondary}`}>
                    {user?.email}
                  </div>
                </div>
              </button>

              {showProfileMenu && (
                <div
                  className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg border z-50 ${
                    isDark
                      ? "bg-card border-border text-white"
                      : "bg-white border-gray-200 text-black"
                  }`}
                >
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm rounded ${
                      isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>
    );
  };

  // Mobile Sidebar Overlay
  const MobileSidebarOverlay: React.FC = () => {
    if (!isMobileSidebarOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
    );
  };

  // Sidebar Menu Component
  const Sidebar: React.FC = () => {
    const sidebarClasses = getSidebarClasses();
    const isOpen = isMobile ? isMobileSidebarOpen : isSidebarOpen;
    const width = isOpen ? "w-64" : "w-20";

    return (
      <div className={isDark ? "dark" : ""}>
        <aside
          ref={setSidebarRef}
          className={`sidebar-scroll ${width} ${sidebarClasses.bg} border-r ${
            sidebarClasses.border
          } h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-50 ${
            isMobile && !isMobileSidebarOpen
              ? "-translate-x-full"
              : "translate-x-0"
          }`}
          style={{
            ...(sidebarClasses.useCustomBg && sidebarClasses.customBg
              ? { backgroundColor: sidebarClasses.customBg }
              : {}),
          }}
        >
          <div className="p-4 pb-20">
            {/* Logo Section */}
            <div
              className={`flex items-center ${
                isOpen ? "justify-between" : "justify-center"
              } px-3 py-4 mb-6`}
            >
              <div
                className={`flex items-center gap-2 ${isOpen ? "" : "flex-col"}`}
              >
                <div
                  className={`w-8 h-8 ${sidebarClasses.logo} rounded-lg flex items-center justify-center ${sidebarClasses.logoText} font-bold overflow-hidden`}
                >
                  {brandLogoUrl && !isBrandLogoError ? (
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="w-full h-full object-cover"
                      onError={() => setIsBrandLogoError(true)}
                    />
                  ) : (
                    getInitials(brandName || "A")
                  )}
                </div>
                {isOpen && (
                  <span
                    className={`text-xl font-semibold ${sidebarClasses.brandText}`}
                  >
                    {brandName}
                  </span>
                )}
              </div>

              {isMobile && isOpen && (
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`p-2 ${sidebarClasses.menuHover} rounded-lg`}
                >
                  <X className={`w-5 h-5 ${sidebarClasses.menuIcon}`} />
                </button>
              )}
            </div>

            {/* Loading state */}
            {isLoadingPermissions ? (
              <div className="text-center py-4">
                <div className={`text-sm ${sidebarClasses.menuText}`}>
                  Loading menu...
                </div>
              </div>
            ) : (
              visibleSections.map((section, index) => (
                <div key={index} className="mb-6">
                  {isOpen && (
                    <h3
                      className={`text-xs font-semibold ${sidebarClasses.sectionTitle} uppercase tracking-wider mb-3 px-3`}
                    >
                      {section.title}
                    </h3>
                  )}
                  <nav className="space-y-1">
                    {section.items.map((item) => {
                      const IconComponent = item.icon;
                      const forceExpand = Boolean(globalSearchQuery.trim());
                      const isExpanded =
                        forceExpand || expandedMenus.includes(item.id);
                      const isItemSelected = selectedItemId === item.id;
                      const isExpandableItem = Boolean(
                        item.expandable ||
                          (item.children && item.children.length > 0),
                      );

                      return (
                        <div key={item.id}>
                          {isExpandableItem ? (
                            <>
                              {/* Parent expandable button — never gets active styling */}
                              <button
                                onClick={() =>
                                  handleExpandableMenuClick(item.id)
                                }
                                className={`w-full flex ${
                                  isOpen
                                    ? "flex-row items-center justify-between"
                                    : "flex-col items-center justify-center"
                                } px-3 py-2.5 rounded-lg ${sidebarClasses.menuText} ${sidebarClasses.menuHover}`}
                              >
                                <div
                                  className={`flex ${
                                    isOpen
                                      ? "flex-row items-center gap-3"
                                      : "flex-col items-center gap-1"
                                  }`}
                                >
                                  <IconComponent
                                    className={`w-5 h-5 ${sidebarClasses.menuIcon}`}
                                  />
                                  <span
                                    className={`${isOpen ? "text-sm" : "text-[10px]"} font-medium ${!isOpen ? "text-center leading-tight" : ""}`}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                                {isOpen && (
                                  <ChevronDown
                                    className={`w-4 h-4 ${
                                      sidebarClasses.chevron
                                    } transition-transform ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                )}
                              </button>

                              {/* Children when sidebar is OPEN */}
                              {isOpen && isExpanded && item.children && (
                                <div className="ml-11 mt-1 space-y-1">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive =
                                      selectedItemId === child.id;
                                    return (
                                      <Link
                                        key={child.id}
                                        href={child.path}
                                        onMouseDown={captureSidebarScroll}
                                        onClick={() => {
                                          handleMenuClick(child.id);
                                          if (isMobile)
                                            setIsMobileSidebarOpen(false);
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline visited:text-inherit focus-visible:outline-none ${
                                          isChildActive
                                            ? ""
                                            : `${sidebarClasses.menuText} ${sidebarClasses.menuHover}`
                                        }`}
                                        style={getActiveItemBgStyle(child.id)}
                                      >
                                        <ChildIcon className="w-4 h-4" />
                                        <span>{child.label}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Children when sidebar is COLLAPSED */}
                              {!isOpen && isExpanded && item.children && (
                                <div className="mt-1 space-y-1">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive =
                                      selectedItemId === child.id;
                                    return (
                                      <Link
                                        key={child.id}
                                        href={child.path}
                                        onMouseDown={captureSidebarScroll}
                                        onClick={() => {
                                          handleMenuClick(child.id);
                                          if (isMobile)
                                            setIsMobileSidebarOpen(false);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg font-medium no-underline visited:text-inherit focus-visible:outline-none ${
                                          isChildActive
                                            ? ""
                                            : `${sidebarClasses.menuText} ${sidebarClasses.menuHover}`
                                        }`}
                                        style={getActiveItemBgStyle(child.id)}
                                      >
                                        <ChildIcon className="w-4 h-4" />
                                        <span className="text-[9px] text-center leading-tight">
                                          {child.label}
                                        </span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            // Non-expandable top-level item
                            <Link
                              href={item.path || "#"}
                              onMouseDown={captureSidebarScroll}
                              className={`flex no-underline visited:text-inherit focus-visible:outline-none ${
                                isOpen
                                  ? "flex-row items-center gap-3"
                                  : "flex-col items-center gap-1"
                              } px-3 py-2.5 rounded-lg ${
                                isItemSelected
                                  ? ""
                                  : `${sidebarClasses.menuText} ${sidebarClasses.menuHover}`
                              }`}
                              onClick={() => {
                                handleMenuClick(item.id);
                                if (isMobile) setIsMobileSidebarOpen(false);
                              }}
                              style={getActiveItemBgStyle(item.id)}
                            >
                              <IconComponent className="w-5 h-5" />
                              <span
                                className={`${isOpen ? "text-sm" : "text-[10px] text-center leading-tight"} ${
                                  isItemSelected
                                    ? "font-semibold"
                                    : "font-medium"
                                }`}
                              >
                                {item.label}
                              </span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>
              ))
            )}
          </div>
        </aside>
        <style jsx global>{`
          .sidebar-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
            overflow-anchor: none;
            scroll-behavior: auto;
          }
          .sidebar-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div
      className={`${isDark ? "dark" : ""} bg-background min-h-screen overflow-hidden flex flex-col`}
    >
      {menuLayout === "topnav" ? renderTopNavHeader() : renderSidebarHeader()}

      <MobileSidebarOverlay />

      {menuLayout === "sidebar" && <Sidebar />}

      <main
        className={`
          flex-1 overflow-y-auto
          pt-16
          px-4 md:px-6
          pb-6
          ${
            menuLayout === "sidebar" && !isMobile
              ? isSidebarOpen
                ? "lg:ml-64"
                : "lg:ml-20"
              : ""
          }
          transition-all duration-300
        `}
      >
        {children}
      </main>
    </div>
  );
};

export default DualHeaderLayout;
