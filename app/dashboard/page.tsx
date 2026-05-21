"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AssignedLead = {
  id: string
  name: string
  phone: string
  createdAt: string
}

type ProviderDashboard = {
  id: number
  name: string
  remainingQuota: number
  monthlyAssigned: number
  leadsReceived: number
  assignedLeads: AssignedLead[]
}

type ProviderTabKey = 'summary' | 'leads'

export default function DashboardPage() {
  const [providerData, setProviderData] = useState<ProviderDashboard[]>([])
  const [activeProviderId, setActiveProviderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load dashboard data: ${res.status}`)
      const data = await res.json()
      setProviderData(data.providers ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeProviderId && providerData.length > 0) {
      setActiveProviderId(providerData[0].id)
    }
  }, [providerData, activeProviderId])

  // Poll every 5s for real-time updates
  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <Link href="/request-service" className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
        View Request Service
      </Link>
      {loading && <p>Loading provider data...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && providerData.length === 0 && <p>No provider data available.</p>}

      <div className="space-y-6 mt-6">
        <div className="flex flex-wrap gap-2 rounded-lg p-2">
          {providerData.map((provider) => {
            const isActive = provider.id === activeProviderId
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setActiveProviderId(provider.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-sky-600 text-white shadow' : 'text-white hover:text-black hover:bg-white'
                }`}
              >
                {provider.name}
              </button>
            )
          })}
        </div>

        {providerData.length > 0 && (
          <section className="border rounded-lg shadow-sm">
            <div className="border-b px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">{providerData.find((provider) => provider.id === activeProviderId)?.name ?? providerData[0].name}</h2>
                <div className="text-sm text-slate-600 mt-1">
                  <span>Remaining quota: {providerData.find((provider) => provider.id === activeProviderId)?.remainingQuota ?? providerData[0].remainingQuota}</span>
                  <span className="mx-3">•</span>
                  <span>Total leads received: {providerData.find((provider) => provider.id === activeProviderId)?.leadsReceived ?? providerData[0].leadsReceived}</span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Remaining quota</div>
                  <div className="text-xl font-semibold">{providerData.find((provider) => provider.id === activeProviderId)?.remainingQuota ?? providerData[0].remainingQuota}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Assigned this month</div>
                  <div className="text-xl font-semibold">{providerData.find((provider) => provider.id === activeProviderId)?.monthlyAssigned ?? providerData[0].monthlyAssigned}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Total leads received</div>
                  <div className="text-xl font-semibold">{providerData.find((provider) => provider.id === activeProviderId)?.leadsReceived ?? providerData[0].leadsReceived}</div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium">Assigned leads</h3>
                {providerData.find((provider) => provider.id === activeProviderId)?.assignedLeads.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-2">No leads assigned yet.</p>
                ) : (
                  <ul className="space-y-3 mt-3">
                    {providerData.find((provider) => provider.id === activeProviderId)?.assignedLeads.map((lead) => (
                      <li key={lead.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-slate-600">{lead.phone}</p>
                          </div>
                          <p className="text-xs text-slate-500">Assigned: {new Date(lead.createdAt).toLocaleString()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
