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
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import type {
  DynamicBuilderField,
  DynamicBuilderFieldType,
  DynamicBuilderOption,
  DynamicFormSchema,
  FormBuilderPayload,
} from "@/interfaces/formBuilder.interface";
import type { FormMasterItem } from "@/interfaces/form.interface";
import type { Account } from "@/interfaces/vehicle.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  createFormBuilder,
  getFormBuilderById,
  updateFormBuilder,
} from "@/services/formBuilderService";
import { getAllForms } from "@/services/formService";
import { getStoredAccountId, getStoredUserId } from "@/utils/storage";

interface AccountInfo {
  accountId: number;
  accountName: string;
}

const controls: Array<{
  type: DynamicBuilderFieldType;
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

const createDefaultField = (
  label = "Registration No.",
  placeholder = "Enter registration no.",
): DynamicBuilderField => ({
  id: createId(),
  type: "text",
  label,
  placeholder,
  required: true,
  options: [],
  validations: {},
});

const normalizeField = (
  field: Partial<DynamicBuilderField> = {},
  index = 0,
): DynamicBuilderField => ({
  id: String(field.id || createId()),
  type: (field.type as DynamicBuilderFieldType) || "text",
  label: String(field.label || `Field ${index + 1}`),
  placeholder: String(field.placeholder || ""),
  required: Boolean(field.required),
  order: Number(field.order || index + 1),
  options: Array.isArray(field.options)
    ? field.options.map((option) => ({
        label: String(option?.label || option?.value || ""),
        value: String(option?.value || option?.label || ""),
      }))
    : [],
  validations:
    field.validations && typeof field.validations === "object"
      ? {
          maxLength: Number(field.validations.maxLength || 0) || undefined,
        }
      : {},
});

const parseSchema = (rawData?: string): DynamicFormSchema => {
  if (!rawData) {
    return {
      layout: "single-column",
      fields: [createDefaultField()],
    };
  }

  try {
    const parsed = JSON.parse(rawData) as Partial<DynamicFormSchema>;
    const fields = Array.isArray(parsed?.fields)
      ? parsed.fields.map((field, index) => normalizeField(field, index))
      : [createDefaultField()];

    return {
      layout: parsed?.layout === "two-column" ? "two-column" : "single-column",
      fields,
    };
  } catch {
    return {
      layout: "single-column",
      fields: [createDefaultField()],
    };
  }
};

const parseSelectOptionsInput = (value: string): DynamicBuilderOption[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ label: item, value: item.toLowerCase().replace(/\s+/g, "_") }));

const DynamicFormBuilderDetailPage: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.dynamicFormBuilder.detail");
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 0);
  const isEditMode = id > 0;

  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    accountId: 0,
    accountName: "",
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [formOptions, setFormOptions] = useState<SearchableOption[]>([]);
  const [selectedFormOption, setSelectedFormOption] =
    useState<SearchableOption | null>(null);
  const [formLookup, setFormLookup] = useState<Record<number, FormMasterItem>>({});
  const [loadingForms, setLoadingForms] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [layoutMode, setLayoutMode] = useState<"single-column" | "two-column">(
    "single-column",
  );
  const [fields, setFields] = useState<DynamicBuilderField[]>([
    createDefaultField(),
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [fetchingData, setFetchingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const localizedControls = useMemo(
    () => [
      {
        type: "text" as const,
        label: t("controls.text"),
        placeholder: "Enter text...",
        icon: TextCursorInput,
      },
      {
        type: "email" as const,
        label: t("controls.email"),
        placeholder: "Enter email...",
        icon: Mail,
      },
      {
        type: "number" as const,
        label: t("controls.number"),
        placeholder: "Enter number...",
        icon: Hash,
      },
      {
        type: "date" as const,
        label: t("controls.date"),
        placeholder: "",
        icon: CalendarDays,
      },
      {
        type: "textarea" as const,
        label: t("controls.textarea"),
        placeholder: "Enter details...",
        icon: AlignLeft,
      },
      {
        type: "select" as const,
        label: t("controls.select"),
        placeholder: "Select option...",
        icon: ChevronDown,
      },
      {
        type: "checkbox" as const,
        label: t("controls.checkbox"),
        placeholder: "",
        icon: CheckSquare,
      },
    ],
    [t],
  );

  const accountOptions = accounts.map((account) => ({
    value: Number(account.id),
    label: account.value,
  }));

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
        accountId: getStoredAccountId(user?.accountId),
        accountName: String(
          user?.accountName || user?.fullName || `Account ${getStoredAccountId()}`,
        ),
      });
    } catch {
      setAccountInfo({
        accountId: getStoredAccountId(),
        accountName: `Account ${getStoredAccountId()}`,
      });
    }
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await getAllAccounts();
        if (!(response?.statusCode === 200) || !Array.isArray(response?.data)) {
          toast.error(response?.message || "Unable to load accounts");
          return;
        }

        const accountList = response.data as Account[];
        setAccounts(accountList);

        setAccountInfo((prev) => {
          const loggedInAccountId = getStoredAccountId(prev.accountId);
          const matchedAccount = accountList.find(
            (account) => Number(account.id) === loggedInAccountId,
          );

          if (isEditMode && prev.accountId > 0) {
            const selectedAccount = accountList.find(
              (account) => Number(account.id) === Number(prev.accountId),
            );

            return {
              accountId: prev.accountId,
              accountName: String(
                selectedAccount?.value || prev.accountName || matchedAccount?.value || "",
              ),
            };
          }

          return {
            accountId: matchedAccount
              ? Number(matchedAccount.id)
              : Number(accountList[0]?.id || prev.accountId || 0),
            accountName: String(
              matchedAccount?.value ||
                accountList[0]?.value ||
                prev.accountName ||
                "",
            ),
          };
        });
      } catch {
        toast.error(t("toast.loadAccountsFailed"));
      } finally {
        setLoadingAccounts(false);
      }
    };

    void loadAccounts();
  }, [isEditMode, t]);

  useEffect(() => {
    const loadForms = async () => {
      try {
        setLoadingForms(true);
        const response = await getAllForms(1, 500, "");
        if (!(response?.success || response?.statusCode === 200)) {
          toast.error(response?.message || t("toast.loadFormsFailed"));
          return;
        }

        const items = Array.isArray(response?.data?.items)
          ? (response.data.items as FormMasterItem[])
          : [];

        setFormLookup(
          items.reduce<Record<number, FormMasterItem>>((acc, item) => {
            acc[Number(item.formId)] = item;
            return acc;
          }, {}),
        );
        setFormOptions(
          items.map((item) => ({
            label: String(item.formName || item.formCode || `Form ${item.formId}`),
            value: Number(item.formId || 0),
            description: String(item.formCode || ""),
          })),
        );
      } catch {
        toast.error(t("toast.loadFormsFailed"));
      } finally {
        setLoadingForms(false);
      }
    };

    void loadForms();
  }, [t]);

  useEffect(() => {
    if (!isEditMode) return;

    const loadBuilder = async () => {
      try {
        setFetchingData(true);
        const response = await getFormBuilderById(id);

        if (!(response?.success || response?.statusCode === 200) || !response?.data) {
          toast.error(response?.message || t("toast.notFound"));
          router.push("/dynamic-formbuilder");
          return;
        }

        const item = response.data;
        const schema = parseSchema(item.rawData);

        setFormCode(String(item.formCode || ""));
        setFormTitle(String(item.formTitle || item.formName || ""));
        setFormDescription(String(item.description || ""));
        setIsActive(Boolean(item.isActive));
        setLayoutMode(schema.layout);
        setFields(schema.fields.length ? schema.fields : [createDefaultField()]);
        setSelectedFieldId(schema.fields[0]?.id || "");

        if (Number(item.accountId || 0) > 0 || item.accountName) {
          setAccountInfo((prev) => ({
            accountId: Number(item.accountId || prev.accountId || 0),
            accountName: String(item.accountName || prev.accountName || ""),
          }));
        }

        if (Number(item.fkFormId || 0) > 0) {
          setSelectedFormOption({
            label: String(item.formName || item.formTitle || `Form ${item.fkFormId}`),
            value: Number(item.fkFormId),
            description: String(item.formCode || ""),
          });
        }
      } catch {
        toast.error(t("toast.loadDetailsFailed"));
        router.push("/dynamic-formbuilder");
      } finally {
        setFetchingData(false);
      }
    };

    void loadBuilder();
  }, [id, isEditMode, router, t]);

  useEffect(() => {
    if (!selectedFormOption || formOptions.length === 0) return;

    const matched = formOptions.find(
      (option) => Number(option.value) === Number(selectedFormOption.value),
    );
    if (matched && matched.label !== selectedFormOption.label) {
      setSelectedFormOption(matched);
    }
  }, [formOptions, selectedFormOption]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId),
    [fields, selectedFieldId],
  );

  const selectedBaseForm = useMemo(
    () => formLookup[Number(selectedFormOption?.value || 0)],
    [formLookup, selectedFormOption],
  );

  const schemaPreview = useMemo(
    () =>
      JSON.stringify(
        {
          layout: layoutMode,
          fields: fields.map((field, index) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            required: field.required,
            order: index + 1,
            ...(field.type === "select" && field.options?.length
              ? { options: field.options }
              : {}),
            ...(field.validations?.maxLength
              ? { validations: { maxLength: field.validations.maxLength } }
              : {}),
          })),
        },
        null,
        2,
      ),
    [fields, layoutMode],
  );

  const addField = (type: DynamicBuilderFieldType) => {
    const control = localizedControls.find((item) => item.type === type);
    if (!control) return;

    const nextField: DynamicBuilderField = {
      id: createId(),
      type,
      label: control.label,
      placeholder: control.placeholder,
      required: false,
      options: type === "select" ? [] : [],
      validations: {},
    };

    setFields((prev) => [...prev, nextField]);
    setSelectedFieldId(nextField.id);
  };

  const updateSelectedField = (patch: Partial<DynamicBuilderField>) => {
    if (!selectedField) return;
    setFields((prev) =>
      prev.map((field) =>
        field.id === selectedField.id
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    );
  };

  const deleteField = (fieldId: string) => {
    const next = fields.filter((field) => field.id !== fieldId);
    setFields(next.length > 0 ? next : [createDefaultField()]);
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
      toast.success(t("toast.copied"));
    } catch {
      toast.error(t("toast.copyFailed"));
    }
  };

  const handleSubmit = async () => {
    const actorUserId = getStoredUserId();
    const resolvedAccountId = getStoredAccountId(accountInfo.accountId);

    if (resolvedAccountId <= 0) {
      toast.error(t("toast.accountRequired"));
      return;
    }
    if (!actorUserId) {
      toast.error(t("toast.missingUser"));
      return;
    }
    if (!selectedFormOption) {
      toast.error(t("toast.baseFormRequired"));
      return;
    }
    if (!formTitle.trim()) {
      toast.error(t("toast.formTitleRequired"));
      return;
    }
    if (fields.length === 0) {
      toast.error(t("toast.fieldRequired"));
      return;
    }

    const payload: FormBuilderPayload = {
      accountId: resolvedAccountId,
      fkFormId: Number(selectedFormOption.value),
      formTitle: formTitle.trim(),
      formCode:
        formCode.trim() || `DFB-${Date.now().toString(36).toUpperCase()}`,
      description: formDescription.trim(),
      rawData: schemaPreview,
      isActive,
      projectName: String(selectedBaseForm?.moduleName || "Fleet"),
      accountName: String(accountInfo.accountName || `Account ${resolvedAccountId}`),
      formName: String(
        selectedBaseForm?.formName || selectedFormOption.label || formTitle.trim(),
      ),
      ...(isEditMode
        ? { updatedByUser: actorUserId }
        : { createdByUser: actorUserId }),
    };

    try {
      setSaving(true);
      const response = isEditMode
        ? await updateFormBuilder(id, payload)
        : await createFormBuilder(payload);

      if (response?.success || response?.statusCode === 200) {
        toast.success(
          response?.message ||
            (isEditMode
              ? t("toast.updated")
              : t("toast.created")),
        );
        router.push("/dynamic-formbuilder");
      } else {
        toast.error(response?.message || t("toast.saveFailed"));
      }
    } catch {
      toast.error(t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <ActionLoader isVisible={true} text={t("loading.page")} />
        <div className="min-h-screen bg-background" />
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={saving}
        text={isEditMode ? t("loading.updating") : t("loading.creating")}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-4`}
      >
        <PageHeader
          title={isEditMode ? t("title.edit") : t("title.create")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.platformTools") },
            { label: t("breadcrumbs.current"), href: "/dynamic-formbuilder" },
            { label: isEditMode ? t("breadcrumbs.edit") : t("breadcrumbs.create") },
          ]}
          showButton
          buttonText={
            saving
              ? t("buttons.saving")
              : isEditMode
                ? t("buttons.update")
                : t("buttons.save")
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
              <label className="block text-sm font-semibold mb-2 text-foreground">
                {t("fields.account")} <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={accountOptions}
                value={
                  accountOptions.find(
                    (option) => Number(option.value) === Number(accountInfo.accountId),
                  ) || null
                }
                onChange={(option) =>
                  setAccountInfo({
                    accountId: Number(option?.value || 0),
                    accountName: String(option?.label || ""),
                  })
                }
                placeholder={t("fields.selectAccount")}
                isLoading={loadingAccounts}
                isDark={isDark}
                noOptionsMessage={t("fields.selectAccount")}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                {t("fields.baseForm")} <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={formOptions}
                value={selectedFormOption}
                onChange={setSelectedFormOption}
                placeholder={t("fields.selectForm")}
                isLoading={loadingForms}
                noOptionsMessage={t("fields.selectForm")}
              />
            </div>
            <div>
              <label
                htmlFor="project-name"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                {t("fields.project")}
              </label>
              <input
                id="project-name"
                value={selectedBaseForm?.moduleName || "Fleet"}
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
                {t("fields.formTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                id="form-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("fields.formTitlePlaceholder")}
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
                {t("fields.formCode")}
              </label>
              <input
                id="form-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t("fields.formCodePlaceholder")}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>
            <div>
              <p className="block text-sm font-semibold mb-2 text-foreground">
                {t("fields.layout")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutMode("single-column")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    layoutMode === "single-column"
                      ? "text-white"
                      : isDark
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-700 border-gray-300"
                  }`}
                  style={
                    layoutMode === "single-column"
                      ? { backgroundColor: selectedColor }
                      : {}
                  }
                >
                  {t("fields.singleColumn")}
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("two-column")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    layoutMode === "two-column"
                      ? "text-white"
                      : isDark
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-700 border-gray-300"
                  }`}
                  style={
                    layoutMode === "two-column"
                      ? { backgroundColor: selectedColor }
                      : {}
                  }
                >
                  {t("fields.twoColumn")}
                </button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label
                htmlFor="form-description"
                className="block text-sm font-semibold mb-2 text-foreground"
              >
                {t("fields.description")}
              </label>
              <input
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("fields.descriptionPlaceholder")}
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
                {t("fields.active")}
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
              {showJson ? t("actions.hideJson") : t("actions.showJson")}
            </button>
            <button
              onClick={handleCopyJson}
              className="px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: selectedColor }}
              type="button"
            >
              <Copy className="w-4 h-4 inline mr-2" />
              {t("actions.copyJson")}
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
              {t("actions.preview")}
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
              <h3 className="font-bold text-foreground">{t("sections.formElements")}</h3>
            </div>
            <div className="p-4 space-y-2">
              {localizedControls.map((control) => {
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
              <h3 className="font-bold text-foreground">{t("sections.formPreview")}</h3>
            </div>
            <div
              className={`p-4 grid gap-3 ${
                layoutMode === "two-column" ? "md:grid-cols-2" : "grid-cols-1"
              }`}
            >
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
                          {t("preview.edit")}
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
                          {field.options?.[0]?.label ||
                            field.placeholder ||
                            "Select option..."}
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
                        maxLength={field.validations?.maxLength}
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
              <h3 className="font-bold text-foreground">{t("sections.properties")}</h3>
            </div>
            <div className="p-4">
              {!selectedField ? (
                <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                  {t("properties.empty")}
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="selected-field-label"
                      className="block text-sm font-medium mb-1 text-foreground"
                    >
                      {t("properties.label")}
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
                        {t("properties.placeholder")}
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

                  {selectedField.type === "select" && (
                    <div>
                      <label
                        htmlFor="selected-field-options"
                        className="block text-sm font-medium mb-1 text-foreground"
                      >
                        {t("properties.options")}
                      </label>
                      <textarea
                        id="selected-field-options"
                        value={(selectedField.options || [])
                          .map((option) => option.label)
                          .join(", ")}
                        onChange={(e) =>
                          updateSelectedField({
                            options: parseSelectOptionsInput(e.target.value),
                          })
                        }
                        placeholder={t("properties.optionsPlaceholder")}
                        className={`w-full px-3 py-2 rounded-lg border min-h-24 ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                        }`}
                      />
                      <p className="text-xs mt-1 text-gray-500">
                        {t("properties.optionsHelp")}
                      </p>
                    </div>
                  )}

                  {(selectedField.type === "text" ||
                    selectedField.type === "email" ||
                    selectedField.type === "textarea") && (
                    <div>
                      <label
                        htmlFor="selected-field-max-length"
                        className="block text-sm font-medium mb-1 text-foreground"
                      >
                        {t("properties.maxLength")}
                      </label>
                      <input
                        id="selected-field-max-length"
                        type="number"
                        min={0}
                        value={selectedField.validations?.maxLength || ""}
                        onChange={(e) =>
                          updateSelectedField({
                            validations: {
                              ...selectedField.validations,
                              maxLength: Number(e.target.value || 0) || undefined,
                            },
                          })
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
                    {t("properties.required")}
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
