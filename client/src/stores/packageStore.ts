import { create } from 'zustand';
import type { IPackage, ITrackingRecord, PackageStatus } from '@/types';
import type { IPackageListItem } from '@/types/package';
import {
  listPackagesAPI,
  getPackageAPI,
  deletePackageAPI,
  refreshPackageAPI,
} from '@/api/package';

interface PackageState {
  packages: IPackage[];
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
  refreshPackage: (id: string) => Promise<void>;
  getGroupedPackages: () => Record<PackageStatus, IPackage[]>;
}

const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
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
    } finally {
      set({ refreshLoading: false });
    }
  },

  getGroupedPackages: () => {
    const { packages } = get();
    return {
      in_transit: packages.filter((p) => p.status === 'in_transit'),
      delivered: packages.filter((p) => p.status === 'delivered'),
      exception: packages.filter((p) => p.status === 'exception'),
    };
  },
}));

export default usePackageStore;
