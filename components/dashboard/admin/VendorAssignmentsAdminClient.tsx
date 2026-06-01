"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

type VendorOption = {
  id: number;
  name: string;
  email: string;
};

type SiteOption = {
  id: number;
  inventoryCode?: string | null;
  outletName: string;
  locationName: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
};

type LeadOption = {
  id: number;
  customerName: string;
};

type AssignmentRow = {
  id: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  vendor: { id: number; name: string; email: string };
  inventoryHoarding: SiteOption;
  lead?: { id: number; customerName: string; email?: string | null } | null;
};

export default function VendorAssignmentsAdminClient(props: {
  vendors: VendorOption[];
  sites: SiteOption[];
  leads: LeadOption[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [siteQuery, setSiteQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const states = useMemo(() => {
    const values = new Set(
      props.sites
        .map((site) => (site.state || "").trim())
        .filter((state) => state.length > 0),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [props.sites]);

  const districts = useMemo(() => {
    if (!selectedState) return [];
    const values = new Set(
      props.sites
        .filter((site) => (site.state || "").trim().toLowerCase() === selectedState.trim().toLowerCase())
        .map((site) => (site.district || "").trim())
        .filter((district) => district.length > 0),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [props.sites, selectedState]);

  const filteredSites = useMemo(() => {
    if (!selectedState || selectedDistricts.length === 0) return [];

    const q = siteQuery.trim().toLowerCase();
    const scopedSites = props.sites.filter((site) => {
      const siteState = (site.state || "").trim().toLowerCase();
      const siteDistrict = (site.district || "").trim().toLowerCase();
      
      const stateMatch = siteState === selectedState.trim().toLowerCase();
      const districtMatch = selectedDistricts.some(
        (d) => d.trim().toLowerCase() === siteDistrict
      );
      
      return stateMatch && districtMatch;
    });

    if (!q) return scopedSites;

    return scopedSites.filter((site) => {
      const location = [
        site.locationName,
        site.city || site.district,
        site.state,
      ]
        .filter(Boolean)
        .join(" ");
      return [site.outletName, site.inventoryCode || "", location]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [props.sites, selectedState, selectedDistricts, siteQuery]);

  const toggleSite = (siteId: number) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId],
    );
  };

  const assignSites = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!vendorId) {
      setError("Select vendor");
      return;
    }
    if (selectedSiteIds.length === 0) {
      setError("Select at least one site");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/vendor-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(vendorId),
          inventoryHoardingIds: selectedSiteIds,
          leadId: leadId ? Number(leadId) : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to assign sites");
      }

      let payload: { createdCount?: number; skippedCount?: number } | null =
        null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      const createdCount = payload?.createdCount ?? selectedSiteIds.length;
      const skippedCount = payload?.skippedCount ?? 0;
      const successMessage =
        skippedCount > 0
          ? `${createdCount} site(s) assigned successfully. ${skippedCount} already-open assignment(s) skipped.`
          : `${createdCount} site(s) assigned successfully.`;

      setSuccess(successMessage);
      toast.success(successMessage);
      setSelectedSiteIds([]);
      setNotes("");
      setLeadId("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to assign sites");
      toast.error(err.message || "Failed to assign sites");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Vendor Site Assignments
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign one or more sites to vendor.
        </p>
      </div>

      <form
        onSubmit={assignSites}
        className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-[#002147] focus:ring-1 focus:ring-[#002147] outline-none transition-all cursor-pointer h-[42px]"
              required
            >
              <option value="">Select vendor</option>
              {props.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Link to Lead (Optional)</label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-[#002147] focus:ring-1 focus:ring-[#002147] outline-none transition-all cursor-pointer h-[42px]"
            >
              <option value="">Link to lead (optional)</option>
              {props.leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  #{lead.id} - {lead.customerName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assignment Notes (Optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Assignment notes (optional)"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-[#002147] focus:ring-1 focus:ring-[#002147] outline-none transition-all h-[42px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedState(value);
                setSelectedDistricts([]);
                setSiteQuery("");
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-[#002147] focus:ring-1 focus:ring-[#002147] outline-none transition-all cursor-pointer h-[42px]"
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {selectedState && (
            <div className="md:col-span-2 border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-800 tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#002147] inline-block animate-pulse"></span>
                  Select Districts
                  <span className="bg-blue-50 text-[#002147] font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {selectedDistricts.length}/{districts.length} Selected
                  </span>
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistricts(districts);
                      setSiteQuery("");
                    }}
                    className="text-xs text-[#002147] hover:text-[#003366] font-bold transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistricts([]);
                      setSiteQuery("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
                {districts.map((district) => {
                  const isChecked = selectedDistricts.includes(district);
                  return (
                    <button
                      key={district}
                      type="button"
                      onClick={() => {
                        setSelectedDistricts((prev) =>
                          prev.includes(district)
                            ? prev.filter((d) => d !== district)
                            : [...prev, district],
                        );
                        setSiteQuery("");
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-1.5 ${
                        isChecked
                          ? "bg-[#002147] border-[#002147] text-white shadow-sm scale-[1.02]"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 fill-current animate-in zoom-in-50 duration-200" viewBox="0 0 20 20">
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                        </svg>
                      )}
                      <span>{district}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              value={siteQuery}
              onChange={(e) => setSiteQuery(e.target.value)}
              placeholder="Search sites by name, site ID, location..."
              disabled={!selectedState || selectedDistricts.length === 0}
              className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2.5 text-sm focus:border-[#002147] focus:ring-1 focus:ring-[#002147] outline-none transition-all disabled:bg-gray-50"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs font-medium text-gray-500">
              {!selectedState
                ? "Step 1: Select a state"
                : selectedDistricts.length === 0
                  ? "Step 2: Select one or more districts"
                  : `Showing ${filteredSites.length} site(s) in ${selectedDistricts.length === districts.length ? "All Districts" : selectedDistricts.join(", ")}, ${selectedState}. Selected: ${selectedSiteIds.length}`}
            </p>

            {selectedState && selectedDistricts.length > 0 && filteredSites.length > 0 && (
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/75 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-all select-none">
                <input
                  type="checkbox"
                  id="select-all-sites"
                  checked={filteredSites.every((s) => selectedSiteIds.includes(s.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const toAdd = filteredSites.map((s) => s.id);
                      setSelectedSiteIds((prev) => Array.from(new Set([...prev, ...toAdd])));
                    } else {
                      const toRemove = filteredSites.map((s) => s.id);
                      setSelectedSiteIds((prev) => prev.filter((id) => !toRemove.includes(id)));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-[#002147]">
                  Select All {filteredSites.length} Sites (Whole Selection)
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/30 space-y-2 scrollbar-thin">
          {!selectedState || selectedDistricts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 font-medium">
              Select state and one or more districts to load sites.
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 font-medium">
              No sites found matching the selected filters.
            </div>
          ) : (
            filteredSites.map((site) => {
              const isChecked = selectedSiteIds.includes(site.id);
              return (
                <label
                  key={site.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "bg-blue-50/50 border-blue-200 text-[#002147] shadow-sm"
                      : "bg-white border-gray-150 text-gray-700 hover:bg-gray-50/80 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSite(site.id)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 truncate">
                        {site.outletName}
                      </span>
                      {site.inventoryCode && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          isChecked 
                            ? "bg-blue-100 border-blue-200 text-blue-800" 
                            : "bg-gray-100 border-gray-200 text-gray-600"
                        }`}>
                          {site.inventoryCode}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 leading-normal block">
                      {[site.locationName, site.city || site.district, site.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#002147] hover:bg-[#003366] text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Assigning...
              </>
            ) : (
              "Assign Selected Sites"
            )}
          </button>
          {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
        </div>
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
      </form>

      <div className="md:hidden space-y-3">
        {props.assignments.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-1"
          >
            <div className="text-sm font-semibold text-gray-900">
              {item.inventoryHoarding.outletName}
            </div>
            <div className="text-xs text-gray-600">
              Vendor: {item.vendor.name}
            </div>
            <div className="text-xs text-gray-600">
              Lead: {item.lead?.customerName || "-"}
            </div>
            <div className="text-xs text-gray-600">Status: {item.status}</div>
          </div>
        ))}
        {props.assignments.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
            No assignments found.
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Site
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {props.assignments.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {item.vendor.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {item.inventoryHoarding.outletName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.inventoryHoarding.inventoryCode || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.lead?.customerName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.status}
                  </td>
                </tr>
              ))}
              {props.assignments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
