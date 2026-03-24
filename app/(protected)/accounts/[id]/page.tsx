"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { Category } from "@/interfaces/account.interface";
import {
  getAccountById,
  getCategoreis,
  saveAccount,
  updateAccount,
} from "@/services/accountService";
import {
  getAllAccounts,
  getCitiesByState,
  getCountries,
  getStatesByCountry,
} from "@/services/commonServie";

interface FormData {
  accountName: string;
  accountCode: string;
  userId: number;
  taxTypeId: number;
  superior: string;
  referrer: string;
  contactName: string;
  countryCode: string;
  phone: string;
  positionDesignation: string;
  countryId: string;
  stateId: string;
  cityId: string;
  zipcode: string;
  address: string;
  businessCountryCode: string;
  contactNumber: string;
  supportTimings: string;
  username: string;
  password: string;
  email: string;
  categoryId: string;
  status: string;
  shareEmail: boolean;
  shareWhatsApp: boolean;
  shareCopyToClipboard: boolean;
  primaryDomain: string;
  businessEmail: string;
  businessAddress: string;
  businessTimeZone: string;
}

interface Account {
  id: number;
  value: string;
}

interface Country {
  countryId: number;
  countryName: string;
  iso2Code: string;
  timezoneName: string;
}

interface State {
  stateId: number;
  stateName: string;
}

interface City {
  cityId: number;
  cityName: string;
}

const EditAccount: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.accounts.detail");
  const tList = useTranslations("pages.accounts.list");
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");
  const isCreateMode = id === "0";

  const [formData, setFormData] = useState<FormData>({
    accountName: "",
    accountCode: "",
    userId: 1,
    taxTypeId: 1,
    superior: "",
    referrer: "",
    contactName: "",
    countryCode: "+91",
    phone: "",
    positionDesignation: "",
    countryId: "",
    stateId: "",
    cityId: "",
    zipcode: "",
    address: "",
    businessCountryCode: "+91",
    contactNumber: "",
    supportTimings: "",
    username: "",
    password: "",
    email: "",
    categoryId: "",
    status: "Active",
    shareEmail: false,
    shareWhatsApp: false,
    shareCopyToClipboard: false,
    primaryDomain: "",
    businessEmail: "",
    businessAddress: "",
    businessTimeZone: "",
  });

  const countryCodes = [
    { code: "+91", country: "India" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "UK" },
    { code: "+971", country: "UAE" },
    { code: "+61", country: "Australia" },
    { code: "+65", country: "Singapore" },
  ];

  const splitPhoneNumber = (rawPhone?: string) => {
    const value = (rawPhone || "").trim();
    if (!value) {
      return { countryCode: "+91", phone: "" };
    }

    const matchedCode = countryCodes.find((item) => value.startsWith(item.code));
    if (matchedCode) {
      return {
        countryCode: matchedCode.code,
        phone: value.slice(matchedCode.code.length).replace(/\D/g, ""),
      };
    }

    return {
      countryCode: "+91",
      phone: value.replace(/\D/g, ""),
    };
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [defaultSuperiorAccountId, setDefaultSuperiorAccountId] = useState("");

  const getLoggedInAccountId = () => {
    if (typeof window === "undefined") return "";
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return String(user?.accountId || "").trim();
    } catch {
      return "";
    }
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const normalizedValue =
      name === "phone" || name === "contactNumber"
        ? value.replace(/\D/g, "").slice(0, 10)
        : value;

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: normalizedValue,
      }));

      // Handle cascading dropdowns
      if (name === "countryId" && normalizedValue) {
        // Reset state and city when country changes
        setFormData((prev) => ({
          ...prev,
          stateId: "",
          cityId: "",
        }));
        setCities([]);
        // Fetch states for selected country
        try {
          const response = await getStatesByCountry(Number(value));
          if (response && Array.isArray(response)) {
            setStates(response);
          }
          // Auto-set timezone from country
          const selectedCountry = countries.find(
            (c) => c.countryId === Number(value),
          );
          if (selectedCountry) {
            setFormData((prev) => ({
              ...prev,
              businessTimeZone: selectedCountry.timezoneName,
            }));
          }
        } catch (error) {
          console.error("Error fetching states:", error);
        }
      }

      if (name === "stateId" && normalizedValue) {
        // Reset city when state changes
        setFormData((prev) => ({
          ...prev,
          cityId: "",
        }));
        // Fetch cities for selected state
        try {
          const response = await getCitiesByState(Number(value));
          if (response && Array.isArray(response)) {
            setCities(response);
          }
        } catch (error) {
          console.error("Error fetching cities:", error);
        }
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.accountName) {
        toast.error(t("toast.accountNameRequired"));
        return;
      }

      if (!formData.categoryId) {
        toast.error(t("toast.categoryRequired"));
        return;
      }

      if (!formData.primaryDomain) {
        toast.error(t("toast.primaryDomainRequired"));
        return;
      }

      if (!formData.businessEmail) {
        toast.error(t("toast.businessEmailRequired"));
        return;
      }

      if (!formData.businessAddress) {
        toast.error(t("toast.businessAddressRequired"));
        return;
      }

      if (!formData.businessTimeZone) {
        toast.error(t("toast.businessTimeZoneRequired"));
        return;
      }

      if (!formData.countryId) {
        toast.error(t("toast.countryRequired"));
        return;
      }

      if (!formData.stateId) {
        toast.error(t("toast.stateRequired"));
        return;
      }

      if (!formData.cityId) {
        toast.error(t("toast.cityRequired"));
        return;
      }

      const generateAccountCode = () =>
        "ACC-" + Date.now().toString(36).toUpperCase();

      const payload = {
        accountName: formData.accountName,
        accountCode:
          formData.accountCode || (isCreateMode ? generateAccountCode() : ""),
        categoryId: Number(formData.categoryId),
        primaryDomain: formData.primaryDomain,
        countryId: Number(formData.countryId),
        stateId: formData.stateId, // Keep as string
        cityId: formData.cityId, // Keep as string
        zipcode: formData.zipcode,
        parentAccountId: formData.superior ? Number(formData.superior) : 0,
        refferCode: formData.referrer,
        userId: formData.userId,
        hierarchyPath: formData.address || "N/A",
        taxTypeId: formData.taxTypeId,
        status: formData.status === "Active",
        fullname: formData.contactName,
        email: formData.email,
        phone: formData.phone
          ? `${formData.countryCode}${formData.phone}`
          : "",
        address: formData.address,
        position: formData.positionDesignation,
        businessPhone: formData.contactNumber
          ? `${formData.businessCountryCode}${formData.contactNumber}`
          : "",
        businessEmail: formData.businessEmail,
        businessAddress: formData.businessAddress,
        businessHours: formData.supportTimings,
        businessTimeZone: formData.businessTimeZone,
        userName: formData.username,
        password: formData.password || undefined,
        share: [
          formData.shareEmail && "Email",
          formData.shareWhatsApp && "WhatsApp",
          formData.shareCopyToClipboard && "Clipboard",
        ]
          .filter(Boolean)
          .join(","),
      };

      const response = isCreateMode
        ? await saveAccount(payload)
        : await updateAccount(payload, id);

      if (response && response.statusCode === 200) {
        toast.success(
          response.message ||
            (isCreateMode
              ? t("toast.createdSuccess")
              : t("toast.updatedSuccess")),
        );
        router.push("/accounts");
      } else if (response && response.statusCode === 409) {
        toast.error(response.message || t("toast.alreadyExists"));
      } else {
        toast.error(response.message || t("toast.genericError"));
      }
    } catch (error) {
      console.error("Error while saving account:", error);
      toast.error(t("toast.submitError"));
    }
  };

  async function fetchCategories() {
    try {
      const response = await getCategoreis();
      if (response && response.statusCode === 200) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function fetchAccounts() {
    try {
      const response = await getAllAccounts();
      if (response && response.statusCode === 200) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  }

  async function fetchCountries() {
    try {
      const response = await getCountries();
      if (response && Array.isArray(response)) {
        setCountries(response);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  }

  const fetchAccount = async () => {
    try {
      if (isCreateMode || !id) {
        setLoading(false);
        return;
      }
      const res = await getAccountById(id);
      if (res?.statusCode === 200 && res?.data) {
        const data = res.data;
        const parsedPhone = splitPhoneNumber(
          data.phone || data.contactPersonPhone || "",
        );
        const parsedBusinessPhone = splitPhoneNumber(data.businessPhone || "");

        const shareValues = (data.share || "")
          .split(",")
          .map((item: string) => item.trim().toLowerCase());

        setFormData({
          accountName: data.accountName || "",
          accountCode: data.accountCode || "",
          userId: Number(data.fk_userid || 1),
          taxTypeId: Number(data.taxTypeId || 1),
          superior: data.parentAccountId?.toString() || "",
          referrer: data.reffer || data.refferCode || "",
          contactName: data.fullname || data.contactPersonName || "",
          countryCode: parsedPhone.countryCode,
          phone: parsedPhone.phone,
          positionDesignation: data.position || "",
          countryId: data.countryId?.toString() || "",
          stateId: data.stateId?.toString() || "",
          cityId: data.cityId?.toString() || "",
          zipcode: data.zipcode || "",
          address: data.address || data.hierarchyPath || "",
          businessCountryCode: parsedBusinessPhone.countryCode,
          contactNumber: parsedBusinessPhone.phone,
          supportTimings: data.businessHours || "",
          username: data.userName || data.usernamesacc || "",
          password: "",
          email: data.email || data.contactPersonEmail || "",
          categoryId: data.categoryId?.toString() || "",
          status: data.status ? "Active" : "Inactive",
          shareEmail: shareValues.includes("email"),
          shareWhatsApp: shareValues.includes("whatsapp"),
          shareCopyToClipboard:
            shareValues.includes("clipboard") ||
            shareValues.includes("copytoclipboard"),
          primaryDomain: data.primaryDomain || "",
          businessEmail: data.businessEmail || data.email || "",
          businessAddress: data.businessAddress || data.address || "",
          businessTimeZone: data.businessTimeZone || "",
        });

        if (data.countryId) {
          const statesResponse = await getStatesByCountry(data.countryId);
          if (statesResponse && Array.isArray(statesResponse)) {
            setStates(statesResponse);
          }
        }

        if (data.stateId) {
          const citiesResponse = await getCitiesByState(Number(data.stateId));
          if (citiesResponse && Array.isArray(citiesResponse)) {
            setCities(citiesResponse);
          }
        }

        setLoading(false);
      } else {
        toast.error(t("toast.fetchAccountFailed"));
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching account:", error);
      toast.error(t("toast.fetchAccountError"));
      setLoading(false);
    }
  };

  useEffect(() => {
    const loggedInAccountId = getLoggedInAccountId();
    if (loggedInAccountId) {
      setDefaultSuperiorAccountId(loggedInAccountId);
    }

    fetchCategories();
    fetchAccounts();
    fetchCountries();

    if (isCreateMode) {
      setLoading(false);
      return;
    }

    if (id) {
      fetchAccount();
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    if (!defaultSuperiorAccountId || !accounts.length || formData.superior) return;
    const existsInList = accounts.some(
      (account) => String(account.id) === defaultSuperiorAccountId,
    );
    if (!existsInList) return;
    setFormData((prev) => ({
      ...prev,
      superior: defaultSuperiorAccountId,
    }));
  }, [accounts, defaultSuperiorAccountId, formData.superior]);
  useEffect(() => {
    if (
      formData.countryId &&
      !formData.businessTimeZone &&
      countries.length > 0
    ) {
      const selectedCountry = countries.find(
        (c) => c.countryId === Number(formData.countryId),
      );
      if (selectedCountry && selectedCountry.timezoneName) {
        setFormData((prev) => ({
          ...prev,
          businessTimeZone: selectedCountry.timezoneName,
        }));
      }
    }
  }, [countries, formData.countryId]);
  if (loading) {
    return (
      <div className={`${isDark ? "dark" : ""} `}>
        <div
          className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6 flex items-center justify-center`}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              {t("loading")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} `}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}>
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title={isCreateMode ? t("title.create") : t("title.edit")}
            breadcrumbs={[
              { label: tList("breadcrumbs.accounts") },
              { label: tList("breadcrumbs.current"), href: "/accounts" },
              { label: isCreateMode ? t("title.create") : t("title.edit") },
            ]}
            showButton
            buttonText={t("buttons.submit")}
            onButtonClick={handleSubmit}
          />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Account Details Section */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2
                className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}
              >
                {t("sections.accountDetails")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Account Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Enter account name"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Superior */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Superior
                  </label>
                  <select
                    name="superior"
                    value={formData.superior}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option value="">Select Superior Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Referrer */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Referrer
                  </label>
                  <select
                    name="referrer"
                    value={formData.referrer}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option value="">Select Referrer</option>
                    <option value="Direct">Direct</option>
                    <option value="Partner Network">Partner Network</option>
                  </select>
                </div>
              </div>

              <h3
                className={`text-sm font-medium mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    placeholder="Name"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Phone
                  </label>
                  <div className="flex gap-0.5">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className={`w-24 px-2 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground"
                          : "bg-white border-gray-300 text-gray-900"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone"
                      maxLength={10}
                      className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                </div>

                {/* Position/Designation */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Position/Designation
                  </label>
                  <input
                    type="text"
                    name="positionDesignation"
                    value={formData.positionDesignation}
                    onChange={handleInputChange}
                    placeholder="Position/Designation"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Address Details Section */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2
                className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}
              >
                {t("sections.addressDetails")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {/* Country */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Country
                  </label>
                  <select
                    name="countryId"
                    value={formData.countryId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.countryId} value={country.countryId}>
                        {country.countryName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State/Province */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    State/Province
                  </label>
                  <select
                    name="stateId"
                    value={formData.stateId}
                    onChange={handleInputChange}
                    disabled={!formData.countryId}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.stateId} value={state.stateId}>
                        {state.stateName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Town/City */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Town/City
                  </label>
                  <select
                    name="cityId"
                    value={formData.cityId}
                    onChange={handleInputChange}
                    disabled={!formData.stateId}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.cityId} value={city.cityId}>
                        {city.cityName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zipcode */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Zipcode
                  </label>
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    placeholder=" Enter Zipcode"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address"
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>
            </div>
          </Card>

          {/* Business Profile Details Section */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2
                className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}
              >
                {t("sections.businessProfile")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Contact Number */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Contact Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="businessCountryCode"
                      value={formData.businessCountryCode}
                      onChange={handleInputChange}
                      className={`w-24 px-2 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground"
                          : "bg-white border-gray-300 text-gray-900"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="Business Contact Number"
                      maxLength={10}
                      className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                </div>

                {/* Support Timings */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Support Timings
                  </label>
                  <input
                    type="text"
                    name="supportTimings"
                    value={formData.supportTimings}
                    onChange={handleInputChange}
                    placeholder="e.g. 9 AM - 5 PM"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Primary Domain */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Primary Domain <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="primaryDomain"
                    value={formData.primaryDomain}
                    onChange={handleInputChange}
                    placeholder="example.com"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Business Email */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleInputChange}
                    placeholder="business@example.com"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Address */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Business Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={handleInputChange}
                    placeholder="Enter business address"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Business Time Zone */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Business Time Zone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessTimeZone"
                    value={formData.businessTimeZone}
                    onChange={handleInputChange}
                    placeholder="Auto-filled from country"
                    disabled
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* User Permission & Access Details Section */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2
                className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}
              >
                {t("sections.userPermission")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Username */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="user@example.com"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Category */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option
                        key={category.categoryId}
                        value={category.categoryId}
                      >
                        {category.labelName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <label
                  className={`block text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Share
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="shareEmail"
                      checked={formData.shareEmail}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: selectedColor }}
                    />
                    <span
                      className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Email
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="shareWhatsApp"
                      checked={formData.shareWhatsApp}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: selectedColor }}
                    />
                    <span
                      className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      WhatsApp
                    </span>
                  </label>
                  {/* <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="shareCopyToClipboard"
                      checked={formData.shareCopyToClipboard}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: selectedColor }}
                    />
                    <span
                      className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Copy To Clipboard
                    </span>
                  </label> */}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
                onClick={() => router.back()}
              >
                {t("buttons.cancel")}
              </button>
            </div>
          </Card>

          {/* Action Buttons */}
        </div>
      </div>
    </div>
  );
};

export default EditAccount;
