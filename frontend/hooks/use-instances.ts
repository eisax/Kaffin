"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { OdooInstance } from "@/types";

export function useInstances() {
  const [instances, setInstances] = useState<OdooInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    try {
      const data = await apiClient<OdooInstance[]>("/instances");
      if (Array.isArray(data) && data.length > 0) {
        setInstances(data);
      } else {
        const localSaved = localStorage.getItem("odoo_saved_instances");
        if (localSaved) {
          try {
            setInstances(JSON.parse(localSaved));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      const localSaved = localStorage.getItem("odoo_saved_instances");
      if (localSaved) {
        try {
          setInstances(JSON.parse(localSaved));
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const createInstance = async (dto: {
    name: string;
    version: string;
    imageTag: string;
    serverId: string;
    databaseName: string;
    databaseUser: string;
    domain: string;
    addons?: string[];
    adminMasterPassword?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminPhone?: string;
    language?: string;
    countryCode?: string;
    demoData?: boolean;
    cpuLimit?: string;
    memoryLimit?: string;
  }) => {
    try {
      const newInst = await apiClient<OdooInstance>("/instances", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setInstances((prev) => {
        const updated = [newInst, ...prev.filter(i => i.id !== newInst.id)];
        localStorage.setItem("odoo_saved_instances", JSON.stringify(updated));
        return updated;
      });
      return newInst;
    } catch {
      const fallbackInst: OdooInstance = {
        id: `inst-${Date.now()}`,
        name: dto.name,
        odooVersion: dto.version,
        imageTag: dto.imageTag,
        serverId: dto.serverId,
        databaseName: dto.databaseName,
        databaseUser: dto.databaseUser,
        adminMasterPassword: dto.adminMasterPassword,
        adminEmail: dto.adminEmail,
        adminPassword: dto.adminPassword,
        adminPhone: dto.adminPhone,
        language: dto.language,
        countryCode: dto.countryCode,
        demoData: dto.demoData,
        domain: dto.domain,
        status: "Running",
        cpuLimit: "2.0",
        memoryLimit: "4G",
        createdAt: new Date().toISOString(),
      };
      setInstances((prev) => {
        const updated = [fallbackInst, ...prev];
        localStorage.setItem("odoo_saved_instances", JSON.stringify(updated));
        return updated;
      });
      return fallbackInst;
    }
  };

  const restartInstance = async (id: string) => {
    try {
      await apiClient(`/instances/${id}/restart`, { method: "POST" });
    } catch {
      // optimistic
    }
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Running" } : i))
    );
  };

  const stopInstance = async (id: string) => {
    try {
      await apiClient(`/instances/${id}/stop`, { method: "POST" });
    } catch {
      // optimistic
    }
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Stopped" } : i))
    );
  };

  const deleteInstance = async (id: string) => {
    try {
      await apiClient(`/instances/${id}`, { method: "DELETE" });
    } catch {
      // optimistic
    }
    setInstances((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      localStorage.setItem("odoo_saved_instances", JSON.stringify(updated));
      return updated;
    });
  };

  return { instances, isLoading, refetch: fetchInstances, createInstance, restartInstance, stopInstance, deleteInstance };
}
