"use client";

import {
  AlignLeft,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Hash,
  Mail,
  Plus,
  SquarePen,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";

const DYNAMIC_FORMS_STORAGE_KEY = "mock_dynamic_form_builders";

type BuilderFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

interface BuilderField {
  id: string;
  type: BuilderFieldType;
  label: string;
  placeholder: string;
  required: boolean;
}

interface AccountInfo {
  accountId: string;
  accountName: string;
}

interface StaticDynamicFormItem {
  formId: number;
  formCode: string;
  formName: string;
  moduleName: string;
  pageUrl: string;
  isActive: boolean;
  filterConfigJson: string;
  createdAt: string;
  updatedAt: string;
}

const controls: Array<{
  type: BuilderFieldType;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: "text",
    label: "Text Input",
    placeholder: "Enter text...",
    icon: TextCursorInput,
  },
  {
    type: "email",
    label: "Email Input",
    placeholder: "Enter email...",
    icon: Mail,
  },
  {
    type: "number",
    label: "Number Input",
    placeholder: "Enter number...",
    icon: Hash,
  },
  { type: "date", label: "Date Picker", placeholder: "", icon: CalendarDays },
  {
    type: "textarea",
    label: "Text Area",
    placeholder: "Enter details...",
    icon: AlignLeft,
  },
  {
    type: "select",
    label: "Dropdown",
    placeholder: "Select option...",
    icon: ChevronDown,
  },
  { type: "checkbox", label: "Checkbox", placeholder: "", icon: CheckSquare },
];

const createId = () =>
  `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const readStoredForms = (): StaticDynamicFormItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DYNAMIC_FORMS_STORAGE_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StaticDynamicFormItem[]) : [];
  } catch {
    return [];
  }
};

const DynamicFormBuilderDetailPage: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 0);
  const isEditMode = id > 0;

  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    accountId: "",
    accountName: "",
  });
  const [formCode, setFormCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [layoutMode, setLayoutMode] = useState<"single" | "two">("single");
  const [fields, setFields] = useState<BuilderField[]>([
    {
      id: createId(),
      type: "text",
      label: "Registration No.",
      placeholder: "Enter registration no.",
      required: true,
    },
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [fetchingData, setFetchingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!selectedFieldId && fields.length) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setAccountInfo({
        accountId: String(user?.accountId || ""),
        accountName: String(
          user?.accountName || user?.fullName || "Current Account",
        ),
      });
    } catch {
      setAccountInfo({ accountId: "", accountName: "Current Account" });
    }
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    setFetchingData(true);
    const item = readStoredForms().find((form) => form.formId === id);
    if (!item) {
      toast.error("Dynamic form not found in static data");
      router.push("/dynamic-formbuilder");
      return;
    }

    setFormCode(item.formCode);
    setFormTitle(item.formName);
    setIsActive(Boolean(item.isActive));

    try {
      const parsed = JSON.parse(item.filterConfigJson) as {
        accountId?: string | number;
        accountName?: string;
        formDescription?: string;
        layoutMode?: "single" | "two";
        fields?: BuilderField[];
      };

      if (parsed.accountId || parsed.accountName) {
        setAccountInfo((prev) => ({
          accountId: String(parsed.accountId || prev.accountId || ""),
          accountName: String(parsed.accountName || prev.accountName || ""),
        }));
      }
      setFormDescription(String(parsed.formDescription || ""));
      if (parsed.layoutMode === "single" || parsed.layoutMode === "two") {
        setLayoutMode(parsed.layoutMode);
      }
      if (Array.isArray(parsed.fields) && parsed.fields.length) {
        setFields(
          parsed.fields.map((field) => ({
            ...field,
            id: field.id || createId(),
          })),
        );
      }
    } catch {
      // keep defaults
    } finally {
      setFetchingData(false);
    }
  }, [id, isEditMode, router]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId),
    [fields, selectedFieldId],
  );

  const schemaPreview = useMemo(
    () =>
      JSON.stringify(
        {
          version: "1.0.0",
          accountId: accountInfo.accountId,
          accountName: accountInfo.accountName,
          formTitle,
          formDescription,
          layoutMode,
          fields,
        },
        null,
        2,
      ),
    [accountInfo, fields, formDescription, formTitle, layoutMode],
  );

  const addField = (type: BuilderFieldType) => {
    const control = controls.find((item) => item.type === type);
    if (!control) return;
    const nextField: BuilderField = {
      id: createId(),
      type,
      label: control.label,
      placeholder: control.placeholder,
      required: false,
    };
    setFields((prev) => [...prev, nextField]);
    setSelectedFieldId(nextField.id);
  };

  const updateSelectedField = (patch: Partial<BuilderField>) => {
    if (!selectedField) return;
    setFields((prev) =>
      prev.map((field) =>
        field.id === selectedField.id ? { ...field, ...patch } : field,
      ),
    );
  };

  const deleteField = (fieldId: string) => {
    const next = fields.filter((field) => field.id !== fieldId);
    setFields(next);
    setSelectedFieldId(next[0]?.id || "");
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const currentIndex = fields.findIndex((field) => field.id === fieldId);
    if (currentIndex < 0) return;
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setFields(reordered);
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(schemaPreview);
      toast.success("Builder JSON copied");
    } catch {
      toast.error("Unable to copy JSON");
    }
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one field in form preview");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const stored = readStoredForms();
    const nextId =
      stored.length > 0
        ? Math.max(...stored.map((item) => item.formId)) + 1
        : 1;

    const payload: StaticDynamicFormItem = {
      formId: isEditMode ? id : nextId,
      formCode:
        formCode.trim() || `DFB-${Date.now().toString(36).toUpperCase()}`,
      formName: formTitle.trim(),
      moduleName: "Platform Tools",
      pageUrl: "/dynamic-formbuilder",
      isActive,
      filterConfigJson: schemaPreview,
      createdAt: isEditMode
        ? stored.find((item) => item.formId === id)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const nextData = isEditMode
      ? stored.map((item) => (item.formId === id ? payload : item))
      : [...stored, payload];

    localStorage.setItem(DYNAMIC_FORMS_STORAGE_KEY, JSON.stringify(nextData));
    toast.success(
      isEditMode
        ? "Dynamic form builder updated (static)"
        : "Dynamic form builder created (static)",
    );
    setSaving(false);
    router.push("/dynamic-formbuilder");
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">Loading dynamic form details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-4`}
      >
        <PageHeader
          title={
            isEditMode
              ? "Edit Dynamic Form Builder (Static)"
              : "Create Dynamic Form Builder (Static)"
          }
          subtitle="Static mode: data is saved in browser localStorage."
          breadcrumbs={[
            { label: "Platform & Tools" },
            { label: "Dynamic Form Builder", href: "/dynamic-formbuilder" },
            { label: isEditMode ? "Edit" : "Create" },
          ]}
          showButton
          buttonText={
            saving
              ? "Saving..."
              : isEditMode
                ? "Update Builder"
                : "Save Builder"
          }
          onButtonClick={handleSubmit}
           showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
        />

        <div
          className={`rounded-2xl border p-4 mt-4 ${
            isDark ? "bg-card border-border" : "bg-white border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="account-name"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Account
              </label>
              <input
                id="account-name"
                value={accountInfo.accountName}
                readOnly
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground"
                    : "bg-gray-100 border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label
                htmlFor="form-title"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Form Title
              </label>
              <input
                id="form-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter form title"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
            <div>
              <label
                htmlFor="form-code"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Form Code
              </label>
              <input
                id="form-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Auto generated if blank"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
            <div>
              <p className="block text-sm font-semibold mb-2 text-foreground">
                Layout
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutMode("single")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    layoutMode === "single"
                      ? "text-white"
                      : isDark
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-700 border-gray-300"
                  }`}
                  style={
                    layoutMode === "single"
                      ? { backgroundColor: selectedColor }
                      : {}
                  }
                >
                  Single Column
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("two")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    layoutMode === "two"
                      ? "text-white"
                      : isDark
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-700 border-gray-300"
                  }`}
                  style={
                    layoutMode === "two"
                      ? { backgroundColor: selectedColor }
                      : {}
                  }
                >
                  Two Column
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="form-description"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                Form Description
              </label>
              <input
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter description"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setShowJson((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isDark
                  ? "border-gray-700 text-gray-200"
                  : "border-gray-300 text-gray-700"
              }`}
              type="button"
            >
              <SquarePen className="w-4 h-4 inline mr-2" />
              {showJson ? "Hide JSON" : "Show JSON"}
            </button>
            <button
              onClick={handleCopyJson}
              className="px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: selectedColor }}
              type="button"
            >
              <Copy className="w-4 h-4 inline mr-2" />
              Copy JSON
            </button>
            <button
              onClick={() => setShowJson(true)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isDark
                  ? "border-gray-700 text-gray-200"
                  : "border-gray-300 text-gray-700"
              }`}
              type="button"
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Preview
            </button>
          </div>

          {showJson && (
            <pre
              className={`mt-4 p-4 rounded-xl text-xs overflow-auto max-h-64 border ${
                isDark
                  ? "bg-gray-900 text-gray-200 border-gray-700"
                  : "bg-gray-50 text-gray-900 border-gray-200"
              }`}
            >
              {schemaPreview}
            </pre>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          <div
            className={`lg:col-span-3 rounded-2xl border ${
              isDark ? "bg-card border-border" : "bg-white border-gray-200"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground">Form Elements</h3>
            </div>
            <div className="p-4 space-y-2">
              {controls.map((control) => {
                const Icon = control.icon;
                return (
                  <button
                    key={control.type}
                    onClick={() => addField(control.type)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm ${
                      isDark
                        ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    type="button"
                  >
                    <Icon className="w-4 h-4" />
                    {control.label}
                    <Plus className="w-4 h-4 ml-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`lg:col-span-6 rounded-2xl border ${
              isDark ? "bg-card border-border" : "bg-white border-gray-200"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground">Form Preview</h3>
            </div>
            <div className="p-4 space-y-3">
              {fields.map((field, index) => {
                const isSelected = selectedFieldId === field.id;
                return (
                  <div
                    key={field.id}
                    className={`rounded-xl border p-3 transition ${
                      isSelected ? "ring-2" : ""
                    } ${
                      isDark
                        ? "bg-gray-900/40 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                    style={
                      isSelected
                        ? { boxShadow: `0 0 0 2px ${selectedColor}` }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {index + 1}. {field.label}{" "}
                        {field.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedFieldId(field.id)}
                          className="px-2 rounded border border-gray-400/40 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "up")}
                          className="p-1 rounded border border-gray-400/40"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "down")}
                          className="p-1 rounded border border-gray-400/40"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteField(field.id)}
                          className="p-1 rounded border border-red-300 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {field.type === "textarea" ? (
                      <textarea
                        disabled
                        placeholder={field.placeholder}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-400"
                        }`}
                      />
                    ) : field.type === "select" ? (
                      <select
                        disabled
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-gray-300"
                            : "bg-gray-50 border-gray-300 text-gray-700"
                        }`}
                      >
                        <option>
                          {field.placeholder || "Select option..."}
                        </option>
                      </select>
                    ) : field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" disabled />
                        {field.label}
                      </label>
                    ) : (
                      <input
                        disabled
                        type={field.type}
                        placeholder={field.placeholder}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
                            : "bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-400"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={`lg:col-span-3 rounded-2xl border ${
              isDark ? "bg-card border-border" : "bg-white border-gray-200"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-foreground">Properties</h3>
            </div>
            <div className="p-4">
              {!selectedField ? (
                <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                  Select any field from preview to edit properties.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="selected-field-label"
                      className="block text-sm font-medium mb-1 text-foreground"
                    >
                      Label
                    </label>
                    <input
                      id="selected-field-label"
                      value={selectedField.label}
                      onChange={(e) =>
                        updateSelectedField({ label: e.target.value })
                      }
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  {selectedField.type !== "checkbox" && (
                    <div>
                      <label
                        htmlFor="selected-field-placeholder"
                        className="block text-sm font-medium mb-1 text-foreground"
                      >
                        Placeholder
                      </label>
                      <input
                        id="selected-field-placeholder"
                        value={selectedField.placeholder}
                        onChange={(e) =>
                          updateSelectedField({ placeholder: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) =>
                        updateSelectedField({ required: e.target.checked })
                      }
                    />
                    Required
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          id="form-footer-actions"
          className="form-footer-actions mt-6 flex justify-end gap-3"
        />
      </div>
    </div>
  );
};

export default DynamicFormBuilderDetailPage;
