 'use client'

import { useState, type ChangeEvent, type SubmitEventHandler } from 'react';
import Toast from '@/components/Toast';
const RequestServicePage = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    service: 'service1',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assignedProviders, setAssignedProviders] = useState<number[] | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError('')
    setAssignedProviders(null)

    if (!form.name || !form.phone || !form.city || !form.service || !form.description) {
      setError('Please fill in all fields before submitting.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to submit your request.')
      }

      setAssignedProviders(data.assignedProviders ?? null)
      setToast({
        type: 'success',
        message: `Request submitted successfully. Assigned providers: ${data.assignedProviders?.join(', ')}`,
      })
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'There was an error submitting the request. Please try again.'
      setError(msg)
      setToast({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8 font-sans flex flex-row justify-center ">
      <form onSubmit={handleSubmit} className="flex-1 max-w-lg grid gap-4 text-white">
        <h1 className="text-3xl font-semibold">Request Service</h1>
        <label className="grid gap-2 text-sm font-medium  ">
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            type="text"
            placeholder="Enter your name"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none  "
          />
        </label>

        <label className="grid gap-2 text-sm font-medium  ">
          Phone Number
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            type="tel"
            placeholder="Enter your phone number"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none  "
          />
        </label>

        <label className="grid gap-2 text-sm font-medium  ">
          City
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            type="text"
            placeholder="Enter your city"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none  "
          />
        </label>

        <label className="grid gap-2 text-sm font-medium  ">
          Service Type
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none  "
          >
            <option value="service1" className='bg-black'>Service 1</option>
            <option value="service2" className='bg-black'>Service 2</option>
            <option value="service3" className='bg-black'>Service 3</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium  ">
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Provide a brief description of your request"
            rows={5}
            className="w-full resize-vertical rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none  "
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <aside className="w-80 ml-8">
        {assignedProviders ? (
          <div className="p-4 rounded-lg border border-slate-200">
            <h2 className="text-lg font-medium mb-3">Assigned Providers</h2>
            <div className="flex flex-wrap gap-2">
              {assignedProviders.map((id) => (
                <div
                  key={id}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 text-slate-800"
                >
                  <span className="font-semibold">Provider {id}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-500">Assigned providers will appear here after submission.</div>
        )}
      </aside>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  )
}

export default RequestServicePage
