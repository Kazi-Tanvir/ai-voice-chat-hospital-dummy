'use client';

import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

type Schedule = {
  id: string;
  day: string;
  timeSlots: string;
};

type Doctor = {
  id: string;
  name: string;
  field: string;
  medicalStudy: string;
  researchBackground: string;
  email: string | null;
  phone: string | null;
  experienceYears: number | null;
  bio: string | null;
  schedules: Schedule[];
};

type Appointment = {
  id: string;
  doctorId: string;
  patientName: string;
  day: string;
  timeSlot: string;
  createdAt: Date | string;
  doctor: Doctor;
};

interface SchedulingClientProps {
  initialDoctors: Doctor[];
  initialAppointments: Appointment[];
}

export default function SchedulingClient({
  initialDoctors,
  initialAppointments,
}: SchedulingClientProps) {
  const [doctors] = useState<Doctor[]>(initialDoctors);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctors[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form state
  const [patientName, setPatientName] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Vapi Voice Assistant state & logic
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');

  useEffect(() => {
    const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '';
    const vapiInstance = new Vapi(vapiPublicKey);

    vapiInstance.on('call-start', () => {
      setCallStatus('active');
    });

    vapiInstance.on('call-end', () => {
      setCallStatus('idle');
      fetchAppointments();
    });

    vapiInstance.on('error', (err: any) => {
      console.error('Vapi Web SDK Error:', err);
      setCallStatus('error');
    });

    setVapi(vapiInstance);

    return () => {
      vapiInstance.stop();
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Failed to reload appointments:', err);
    }
  };

  const handleToggleCall = async () => {
    if (!vapi) return;
    if (callStatus === 'active') {
      vapi.stop();
      setCallStatus('idle');
    } else {
      setCallStatus('connecting');
      try {
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '';
        await vapi.start(assistantId);
      } catch (err) {
        console.error('Failed to start Vapi call:', err);
        setCallStatus('error');
      }
    }
  };

  // Active doctor
  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Filter doctors
  const filteredDoctors = doctors.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.field.toLowerCase().includes(term)
    );
  });

  // Handle doctor selection change - resets form selections
  const handleSelectDoctor = (id: string) => {
    setSelectedDoctorId(id);
    setSelectedDay('');
    setSelectedTimeSlot('');
    setFormFeedback(null);
  };

  // Available days for active doctor
  const availableDays = activeDoctor?.schedules.map((s) => s.day) || [];

  // When day changes, clear slot and set options
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    setSelectedTimeSlot('');
  };

  // Available slots for selected day
  const activeScheduleForDay = activeDoctor?.schedules.find((s) => s.day === selectedDay);
  const timeSlotsOptions = activeScheduleForDay
    ? activeScheduleForDay.timeSlots.split(',').map((slot) => slot.trim())
    : [];

  // Book appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedDay || !selectedTimeSlot || !activeDoctor) {
      setFormFeedback({ type: 'error', message: 'Please fill in all booking fields.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: activeDoctor.id,
          patientName: patientName.trim(),
          day: selectedDay,
          timeSlot: selectedTimeSlot,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to book appointment');
      }

      // Append new appointment to local state
      setAppointments((prev) => [result, ...prev]);
      
      // Reset form
      setPatientName('');
      setSelectedDay('');
      setSelectedTimeSlot('');
      setFormFeedback({ type: 'success', message: 'Appointment booked successfully!' });
    } catch (err: any) {
      console.error(err);
      setFormFeedback({ type: 'error', message: err.message || 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id: string) => {
    const originalAppointments = [...appointments];
    
    // Optimistic Update: remove appointment from UI immediately
    setAppointments((prev) => prev.filter((app) => app.id !== id));

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      console.error(err);
      alert('Could not cancel appointment. Restoring schedule.');
      // Rollback optimistic update
      setAppointments(originalAppointments);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans selection:bg-teal-500 selection:text-zinc-900">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-72 bg-teal-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-zinc-950 text-xl shadow-lg shadow-teal-500/20">
              H
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">VOXAGENT</h1>
              <p className="text-xs text-zinc-400">Hospital Doctor Scheduling System</p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 md:text-right">
            Active Clinicians: <span className="text-teal-400 font-semibold">{doctors.length}</span> | Booked Slots: <span className="text-emerald-400 font-semibold">{appointments.length}</span>
          </div>
        </div>
      </header>

      {/* Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Column 1: Doctor Sidebar (lg:col-span-4) */}
          <section className="lg:col-span-4 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 inline-block animate-pulse" />
              Find a Practitioner
            </h2>
            
            {/* Search Input */}
            <div className="relative mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or field..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Doctors List */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
              {filteredDoctors.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">No doctors found matching "{searchTerm}"</p>
              ) : (
                filteredDoctors.map((doc) => {
                  const isSelected = doc.id === selectedDoctorId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDoctor(doc.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-teal-500/10 border-teal-500/60 shadow-lg shadow-teal-500/5'
                          : 'bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className={`font-semibold text-sm transition-colors ${isSelected ? 'text-teal-300' : 'text-zinc-200'}`}>
                          {doc.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-teal-500/20 text-teal-300 font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{doc.field}</span>
                        {doc.experienceYears && (
                          <span>{doc.experienceYears} yrs exp</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 2: Selected Doctor Profile & Booking Form (lg:col-span-5) */}
          <section className="lg:col-span-5 space-y-8">
            {activeDoctor ? (
              <>
                {/* Doctor Bio Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="border-b border-zinc-800 pb-4 mb-4">
                    <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest">{activeDoctor.field}</span>
                    <h3 className="text-xl font-bold text-white mt-1">{activeDoctor.name}</h3>
                    {activeDoctor.bio && (
                      <p className="text-sm text-zinc-300 mt-2 leading-relaxed italic">"{activeDoctor.bio}"</p>
                    )}
                  </div>

                  <div className="space-y-3.5 text-xs text-zinc-400">
                    <div>
                      <h4 className="font-semibold text-zinc-300 uppercase tracking-wide text-[10px] mb-1">Education & Medical Study</h4>
                      <p className="text-sm text-zinc-300 leading-normal">{activeDoctor.medicalStudy}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-300 uppercase tracking-wide text-[10px] mb-1">Research Background</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{activeDoctor.researchBackground}</p>
                    </div>
                    {(activeDoctor.email || activeDoctor.phone) && (
                      <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-4 text-zinc-400">
                        {activeDoctor.email && <span>📧 {activeDoctor.email}</span>}
                        {activeDoctor.phone && <span>📞 {activeDoctor.phone}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Form Card */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    Schedule Patient Appointment
                  </h3>

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    {/* Patient Name */}
                    <div>
                      <label htmlFor="patientName" className="block text-xs font-medium text-zinc-300 mb-2">
                        Patient Full Name
                      </label>
                      <input
                        id="patientName"
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="John Miller"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                      />
                    </div>

                    {/* Day Selection */}
                    <div>
                      <label htmlFor="daySelect" className="block text-xs font-medium text-zinc-300 mb-2">
                        Choose Available Work Day
                      </label>
                      <select
                        id="daySelect"
                        value={selectedDay}
                        onChange={(e) => handleDayChange(e.target.value)}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                      >
                        <option value="">-- Select Day --</option>
                        {availableDays.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Slot Selection */}
                    <div>
                      <label htmlFor="timeSlotSelect" className="block text-xs font-medium text-zinc-300 mb-2">
                        Available Time Range
                      </label>
                      <select
                        id="timeSlotSelect"
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        disabled={!selectedDay}
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                      >
                        <option value="">
                          {!selectedDay ? 'Please choose a day first' : '-- Select Time --'}
                        </option>
                        {timeSlotsOptions.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Feedback Alert */}
                    {formFeedback && (
                      <div
                        className={`text-xs p-3 rounded-lg border leading-relaxed ${
                          formFeedback.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}
                      >
                        {formFeedback.message}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/15 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                    >
                      {isSubmitting ? 'Scheduling Patient...' : 'Book Appointment'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-center text-zinc-500 py-12">Select a doctor to view profiles and schedule appointments.</div>
            )}
          </section>

          {/* Column 3: Voice Assistant & Scheduled Appointments Tracker (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Voice Assistant Card */}
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              {callStatus === 'active' && (
                <div className="absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none" />
              )}
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    callStatus === 'active' 
                      ? 'bg-teal-400 animate-ping' 
                      : callStatus === 'connecting' 
                      ? 'bg-amber-400 animate-pulse' 
                      : 'bg-zinc-600'
                  } inline-block`} />
                  Voice Agent
                </h2>
                <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-mono">
                  {callStatus.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-col items-center gap-4 text-center py-2">
                <button
                  type="button"
                  onClick={handleToggleCall}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                    callStatus === 'active'
                      ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                      : callStatus === 'connecting'
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                      : 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-500/20 hover:scale-105'
                  }`}
                >
                  {callStatus === 'active' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 8l2 2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v2a2 2 0 00.293 1.017l3 5a2 2 0 001.414.983L10 15m4-1v-4a2 2 0 00-2-2v0m-6 6a2 2 0 00-2 2v3a2 2 0 002 2h2a2 2 0 001.414-.983l1-2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  )}
                </button>

                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-200">
                    {callStatus === 'active'
                      ? 'Connected to Assistant'
                      : callStatus === 'connecting'
                      ? 'Establishing call...'
                      : 'Talk to Assistant'}
                  </h4>
                  <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    {callStatus === 'active'
                      ? 'Say: "Book an appointment for Alice Cooper with Dr. Jane Smith on Monday at 9:00 AM"'
                      : 'Speak directly with our clinic booking assistant to search practitioners and schedule slots.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Appointments Tracker Card */}
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Appointments Tracker
                </h2>
                <button
                  onClick={fetchAppointments}
                  title="Sync Appointments"
                  className="text-zinc-500 hover:text-teal-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.283 8H18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                    <span className="text-3xl inline-block mb-2 text-zinc-700">🗓️</span>
                    <p className="text-xs text-zinc-500">No scheduled appointments yet</p>
                  </div>
                ) : (
                  appointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl flex flex-col gap-2 group relative overflow-hidden transition-all duration-200 hover:border-zinc-700/60"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-zinc-200">{app.patientName}</span>
                          <span className="text-[10px] text-zinc-400 mt-0.5">doctor: <strong className="text-zinc-300">{app.doctor?.name}</strong></span>
                        </div>
                        
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          title="Cancel Appointment"
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-1 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span className="text-teal-400">📅</span>
                          <span>{app.day}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-teal-400">⏰</span>
                          <span>{app.timeSlot}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
