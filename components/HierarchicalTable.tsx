"use client";

import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Network,
  Search,
} from "lucide-react";
import React, { useState } from "react";
import { useColor } from "@/context/ColorContext";
import {
  HierarchicalTableProps,
  HierarchyNode,
} from "@/interfaces/table.interface";

const HierarchicalTable: React.FC<HierarchicalTableProps> = ({
  title = "RELATIONAL MAPPING",
  subtitle = "Recursive visualization of distributor-dealer relationships.",
  data,
  onEdit,
  showSearch = true,
}) => {
  const { selectedColor } = useColor();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "under review":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "suspended":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400";
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
    if (!searchQuery) return nodes;

    return nodes
      .map((node) => {
        const matchesSearch =
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.code.toLowerCase().includes(searchQuery.toLowerCase());

        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        if (matchesSearch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as HierarchyNode[];
  };

  const renderNode = (node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = level * 40;

    return (
      <div key={node.id}>
        <div className="flex items-center justify-between px-6 py-4 hover:bg-background/50 transition-colors border-b border-border group">
          <div
            className="flex items-center gap-4 flex-1"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="text-foreground opacity-50 hover:opacity-100 transition-opacity"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground opacity-30" />
              </div>
            )}

            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: node.avatarColor || selectedColor }}
            >
              {node.avatar || getInitials(node.name)}
            </div>

            {/* Name and Type */}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {node.name}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: selectedColor }}
                >
                  {node.type}
                </span>
                <span
                  className="text-xs text-foreground opacity-50"
                  style={{ color: selectedColor }}
                >
                  {node.code}
                </span>
              </div>
            </div>
          </div>

          {/* Status and Managed */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground opacity-50 uppercase tracking-wide mb-1">
                STATUS
              </span>
              <span
                className={`inline-flex px-3 py-1 text-xs font-bold rounded uppercase tracking-wide ${getStatusColor(
                  node.status,
                )}`}
              >
                {node.status}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground opacity-50 uppercase tracking-wide mb-1">
                MANAGED
              </span>
              <span className="text-sm font-bold text-foreground">
                {node.managed}
              </span>
            </div>

            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={() => onEdit(node)}
                className="text-foreground opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-2"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredData = filterNodes(data);

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-border flex justify-between items-center">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${selectedColor}20` }}
          >
            <Network className="w-5 h-5" style={{ color: selectedColor }} />
          </div>
          <div>
            <h2
              className="text-sm font-bold uppercase tracking-wide mb-1"
              style={{ color: selectedColor }}
            >
              {title}
            </h2>
            <p className="text-sm text-foreground opacity-60">{subtitle}</p>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground opacity-40 w-4 h-4" />
            <input
              type="text"
              placeholder="Quick find..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 bg-background text-foreground placeholder:text-foreground placeholder:opacity-50"
              //   style={{ focusRingColor: selectedColor }}
            />
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="overflow-x-auto">
        {filteredData.length > 0 ? (
          <div>{filteredData.map((node) => renderNode(node))}</div>
        ) : (
          <div className="p-12 text-center text-foreground opacity-50">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalTable;
