import { create } from 'zustand';
import type { IPackage, ITrackingRecord, PackageStatus } from '@/types';
import type { IPackageListItem } from '@/types/package';
import {
  listPackagesAPI,
  getPackageAPI,
  deletePackageAPI,
  refreshPackageAPI,
} from '@/api/package';

export type FilterStatus = PackageStatus | 'all';

interface PackageState {
  packages: IPackage[];
  searchKey: string;
  filterStatus: FilterStatus;
  selectedPackageId: string | null;
  selectedPackage: IPackageListItem | null;
  trackingRecords: ITrackingRecord[];
  listLoading: boolean;
  detailLoading: boolean;
  refreshLoading: boolean;

  fetchPackages: () => Promise<void>;
  selectPackage: (id: string) => Promise<void>;
  clearSelection: () => void;
  deletePackage: (id: string) => Promise<void>;
  refreshPackage: (id: string) => Promise<{ oldStatus?: PackageStatus; newStatus?: PackageStatus }>;
  setSearchKey: (key: string) => void;
  setFilterStatus: (status: FilterStatus) => void;
  getFilteredPackages: () => IPackage[];
  getGroupedPackages: () => Record<PackageStatus, IPackage[]>;
  getStats: () => { total: number; in_transit: number; delivered: number; exception: number };
}

const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
  searchKey: '',
  filterStatus: 'all',
  selectedPackageId: null,
  selectedPackage: null,
  trackingRecords: [],
  listLoading: false,
  detailLoading: false,
  refreshLoading: false,

  fetchPackages: async () => {
    set({ listLoading: true });
    try {
      const res = await listPackagesAPI();
      const data = res.data!;
      set({ packages: data.packages });
    } finally {
      set({ listLoading: false });
    }
  },

  selectPackage: async (id: string) => {
    const { selectedPackageId } = get();
    if (selectedPackageId === id) return;

    set({ selectedPackageId: id, detailLoading: true, selectedPackage: null, trackingRecords: [] });
    try {
      const res = await getPackageAPI(id);
      const data = res.data!;
      set({
        selectedPackage: data.package,
        trackingRecords: data.trackingRecords,
      });
    } catch {
      set({ selectedPackageId: null });
    } finally {
      set({ detailLoading: false });
    }
  },

  clearSelection: () => {
    set({
      selectedPackageId: null,
      selectedPackage: null,
      trackingRecords: [],
    });
  },

  deletePackage: async (id: string) => {
    await deletePackageAPI(id);
    const { selectedPackageId } = get();
    if (selectedPackageId === id) {
      set({
        selectedPackageId: null,
        selectedPackage: null,
        trackingRecords: [],
      });
    }
    set((state) => ({
      packages: state.packages.filter((p) => p._id !== id),
    }));
  },

  refreshPackage: async (id: string) => {
    const oldStatus = get().packages.find((p) => p._id === id)?.status;
    set({ refreshLoading: true });
    try {
      const res = await refreshPackageAPI(id);
      const data = res.data!;
      const refreshedPkg = data.package;
      const refreshedRecords = data.trackingRecords;

      set((state) => ({
        packages: state.packages.map((p) =>
          p._id === id
            ? {
                ...p,
                status: refreshedPkg.status,
                fromCity: refreshedPkg.fromCity,
                toCity: refreshedPkg.toCity,
                lastSyncAt: refreshedPkg.lastSyncAt,
                updatedAt: refreshedPkg.updatedAt,
              }
            : p,
        ),
        selectedPackage: refreshedPkg,
        trackingRecords: refreshedRecords,
      }));

      return { oldStatus, newStatus: refreshedPkg.status };
    } finally {
      set({ refreshLoading: false });
    }
  },

  setSearchKey: (key: string) => {
    set({ searchKey: key });
  },

  setFilterStatus: (status: FilterStatus) => {
    set({ filterStatus: status });
  },

  getFilteredPackages: () => {
    const { packages, searchKey, filterStatus } = get();
    let result = packages;

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (searchKey.trim()) {
      const key = searchKey.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.trackingNo.toLowerCase().includes(key) ||
          p.alias.toLowerCase().includes(key),
      );
    }

    return result;
  },

  getGroupedPackages: () => {
    const filtered = get().getFilteredPackages();
    return {
      in_transit: filtered.filter((p) => p.status === 'in_transit'),
      delivered: filtered.filter((p) => p.status === 'delivered'),
      exception: filtered.filter((p) => p.status === 'exception'),
    };
  },

  getStats: () => {
    const filtered = get().getFilteredPackages();
    return {
      total: filtered.length,
      in_transit: filtered.filter((p) => p.status === 'in_transit').length,
      delivered: filtered.filter((p) => p.status === 'delivered').length,
      exception: filtered.filter((p) => p.status === 'exception').length,
    };
  },
}));

export default usePackageStore;
